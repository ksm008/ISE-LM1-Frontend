// 라우터 콘솔 세션: 모드 전환, 로그인·enable 비밀번호, 명령 실행, 저장·재부팅, 출력 필터(|), 자동 로그아웃.
// 화면(xterm)과 분리되어 있어 테스트에서 그대로 쓸 수 있다.
import { TREES } from './commands/index.js';
import { complete as treeComplete, help as treeHelp, isNegated, tokenize, walk } from './engine/parser.js';
import { runnerOf } from './engine/tree.js';
import { cloneDevice, createDevice } from './device/device.js';
import { verifySecret } from './crypto/passwords.js';

const MODE_SUFFIX = {
  user: '>',
  priv: '#',
  config: '(config)#',
  'config-if': '(config-if)#',
  'config-line': '(config-line)#',
};
const CONFIG_MODES = new Set(['config', 'config-if', 'config-line']);
const FILTERS = [
  { word: 'begin', help: '일치하는 줄부터 끝까지' },
  { word: 'exclude', help: '일치하는 줄 빼기' },
  { word: 'include', help: '일치하는 줄만' },
  { word: 'section', help: '일치하는 줄과 그 아래 들여쓴 줄' },
];
const HISTORY_SIZE = 20;

function timestamp() {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `*${months[now.getUTCMonth()]} ${String(now.getUTCDate()).padStart(2)} ${p(now.getUTCHours())}:${p(now.getUTCMinutes())}:${p(now.getUTCSeconds())}.${p(now.getUTCMilliseconds(), 3)}`;
}

export function formatHelp(items) {
  const sorted = [...items].filter((i) => i.label !== '<cr>');
  sorted.sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
  if (items.some((i) => i.label === '<cr>')) sorted.push({ label: '<cr>', help: '' });
  const width = Math.max(...sorted.map((i) => i.label.length));
  return sorted.map((i) => `  ${i.label.padEnd(width)}  ${i.help}`.trimEnd());
}

export class RouterSession {
  /**
   * @param {object} opts
   * @param {object|null} opts.startup 저장된 설정 (없으면 기본 설정)
   * @param {(text: string) => void} opts.onOutput 화면에 쓸 텍스트 (\r\n 포함)
   * @param {() => void} opts.onAsync 비동기로 상태가 바뀌었을 때 (자동 로그아웃) 프롬프트를 다시 그리라는 알림
   * @param {(startup: object|null) => void} opts.onStartupChange 저장된 설정이 바뀌었을 때
   * @param {boolean} opts.timers 자동 로그아웃 타이머 사용 (테스트에서는 false)
   */
  constructor({ startup = null, onOutput = () => {}, onAsync = () => {}, onStartupChange = () => {}, timers = true } = {}) {
    this.startup = startup ? cloneDevice(startup) : null;
    this.emit = onOutput;
    this.onAsync = onAsync;
    this.onStartupChange = onStartupChange;
    this.timers = timers;
    this.history = [];
    this.capture = null;
    this.timer = null;
    this.boot();
  }

  // ---- 출력 ----
  print(...lines) {
    const all = lines.flatMap((l) => String(l).split('\n'));
    if (this.capture) this.capture.push(...all);
    else this.emit(all.map((l) => `${l}\r\n`).join(''));
  }

  log(message) {
    this.print(`${timestamp()}: ${message}`);
  }

  // ---- 입력 상태 ----
  /** 현재 프롬프트 */
  get prompt() {
    const input = this.input;
    if (input.kind === 'cli') return `${this.device.hostname}${MODE_SUFFIX[this.mode]}`;
    if (input.kind === 'text' || input.kind === 'secret') return input.prompt;
    return '';
  }

  /** 입력한 글자를 화면에 보여 줄지 (비밀번호는 보이지 않음) */
  get echo() {
    return this.input.kind !== 'secret';
  }

  /** ? 와 Tab 을 명령 도움말로 쓸지 */
  get interactive() {
    return this.input.kind === 'cli';
  }

  ask(prompt, handler) {
    this.input = { kind: 'text', prompt, handler };
  }

  askSecret(prompt, handler) {
    this.input = { kind: 'secret', prompt, handler };
  }

  waitReturn(handler) {
    this.input = { kind: 'return', handler };
  }

  readBanner(delim, first, onDone) {
    this.input = { kind: 'banner', delim, parts: first ? [first] : [''], onDone };
  }

  // ---- 부팅·로그인 ----
  boot() {
    clearTimeout(this.timer);
    this.device = this.startup ? cloneDevice(this.startup) : createDevice();
    this.bootedAt = Date.now();
    this.mode = null;
    this.sub = null;
    this.loginUser = null;
    this.print(
      '',
      'ISE·LM1 라우터 시뮬레이터 (IOS 스타일 명령 학습용)',
      this.startup ? '저장된 설정(startup-config)을 불러왔습니다.' : '저장된 설정이 없어 기본 설정으로 시작합니다.',
      '',
      '',
      'Press RETURN to get started!',
      '',
    );
    this.waitReturn(() => this.beginConsoleLogin());
  }

  beginConsoleLogin() {
    const d = this.device;
    const line = d.lines.con[0];
    if (d.bannerMotd !== null) this.print(d.bannerMotd);
    if (line.login === 'login' && line.password) {
      this.print('', 'User Access Verification', '');
      this.loginWithLinePassword(line, 0);
    } else if (line.login === 'local') {
      this.print('', 'User Access Verification', '');
      this.loginLocal(0);
    } else {
      this.enterExec('user', null);
    }
  }

  loginWithLinePassword(line, failures) {
    this.askSecret('Password: ', (pw) => {
      if (pw === line.password.plain) {
        this.enterExec('user', null);
        return;
      }
      if (failures + 1 >= 3) {
        this.print('% Bad passwords', '');
        this.waitReturn(() => this.beginConsoleLogin());
        return;
      }
      this.loginWithLinePassword(line, failures + 1);
    });
  }

  loginLocal(failures) {
    this.ask('Username: ', (name) => {
      this.askSecret('Password: ', (pw) => {
        const user = this.device.users[name];
        const ok = user && (user.secret ? verifySecret(pw, user.secret.hash) : user.password && user.password.plain === pw);
        if (ok) {
          this.enterExec(user.privilege >= 15 ? 'priv' : 'user', name);
          return;
        }
        this.print('% Login invalid', '');
        if (failures + 1 >= 3) {
          this.print('% Bad passwords', '');
          this.waitReturn(() => this.beginConsoleLogin());
          return;
        }
        this.loginLocal(failures + 1);
      });
    });
  }

  enterExec(mode, user) {
    this.mode = mode;
    this.sub = null;
    this.loginUser = user;
    this.input = { kind: 'cli' };
    this.touch();
  }

  /** enable: 사용자 모드 → 특권 모드 */
  requestEnable() {
    const d = this.device;
    let check = null;
    if (d.enableSecret) check = (pw) => verifySecret(pw, d.enableSecret.hash);
    else if (d.enablePassword) check = (pw) => pw === d.enablePassword.plain;
    if (!check) {
      this.mode = 'priv'; // 콘솔은 enable 비밀번호가 없으면 바로 들어간다
      return;
    }
    const attempt = (failures) =>
      this.askSecret('Password: ', (pw) => {
        if (check(pw)) {
          this.mode = 'priv';
          return;
        }
        if (failures + 1 >= 3) {
          this.print('% Bad secrets', '');
          return;
        }
        attempt(failures + 1);
      });
    attempt(0);
  }

  logout() {
    clearTimeout(this.timer);
    this.mode = null;
    this.sub = null;
    this.loginUser = null;
    this.print('', '', '', `${this.device.hostname} con0 is now available`, '', '', '', '', '', 'Press RETURN to get started.', '');
    this.waitReturn(() => this.beginConsoleLogin());
  }

  endConfig() {
    this.mode = 'priv';
    this.sub = null;
    this.log('%SYS-5-CONFIG_I: Configured from console by console');
  }

  // ---- 저장·재부팅 ----
  isDirty() {
    return JSON.stringify(this.device) !== JSON.stringify(this.startup ?? createDevice());
  }

  saveStartup() {
    this.startup = cloneDevice(this.device);
    this.onStartupChange(cloneDevice(this.startup));
  }

  eraseStartup() {
    this.startup = null;
    this.onStartupChange(null);
  }

  requestReload() {
    const proceed = () =>
      this.ask('Proceed with reload? [confirm]', (answer) => {
        if (answer === '' || /^y/i.test(answer)) {
          this.print('', '%SYS-5-RELOAD: Reload requested by console. Reload Reason: Reload Command.');
          this.boot();
        }
      });
    if (!this.isDirty()) {
      proceed();
      return;
    }
    this.ask('System configuration has been modified. Save? [yes/no]: ', (answer) => {
      if (/^y(es)?$/i.test(answer)) {
        this.saveStartup();
        this.print('Building configuration...', '[OK]');
        proceed();
      } else if (/^no?$/i.test(answer)) {
        proceed();
      } else {
        this.print("% Please answer 'yes' or 'no'.");
        this.requestReload();
      }
    });
  }

  // ---- 자동 로그아웃 (line con 0 의 exec-timeout) ----
  touch() {
    clearTimeout(this.timer);
    if (!this.timers || this.mode === null) return;
    const [m, s] = this.device.lines.con[0].execTimeout;
    const ms = (m * 60 + s) * 1000;
    if (ms <= 0) return;
    this.timer = setTimeout(() => {
      if (CONFIG_MODES.has(this.mode)) this.endConfig();
      this.print('');
      this.logout();
      this.onAsync();
    }, ms);
  }

  // ---- 입력 처리 ----
  /** Enter 를 누른 한 줄 */
  submit(raw) {
    const input = this.input;
    if (input.kind === 'cli') {
      this.runCli(raw);
      this.touch();
      return;
    }
    if (input.kind === 'banner') {
      const at = raw.indexOf(input.delim);
      if (at < 0) {
        input.parts.push(raw);
        return;
      }
      input.parts.push(raw.slice(0, at));
      this.input = { kind: 'cli' };
      input.onDone(input.parts.join('\n'));
      return;
    }
    // 한 번 답을 받으면 기본적으로 명령 입력으로 돌아간다 (handler 가 다른 입력을 요청할 수 있음)
    this.input = { kind: 'cli' };
    input.handler(input.kind === 'secret' ? raw : raw.trim());
    if (this.mode !== null) this.touch();
  }

  /** Ctrl+Z (end) / Ctrl+C (취소) */
  interrupt(key) {
    if (this.input.kind !== 'cli') {
      if (this.mode !== null) this.input = { kind: 'cli' };
      return;
    }
    if (CONFIG_MODES.has(this.mode)) this.endConfig();
    else if (key === 'z') this.print('');
  }

  ctx(res) {
    return {
      d: this.device,
      session: this,
      negated: isNegated(res.path),
      args: res.args,
      sub: this.sub,
      out: (...lines) => this.print(...lines),
      log: (message) => this.log(message),
      enter: (mode, sub = null) => {
        this.mode = mode;
        this.sub = sub;
      },
    };
  }

  caretError(token) {
    const pos = this.prompt.length + (token?.start ?? 0);
    this.print(`${' '.repeat(pos)}^`, "% Invalid input detected at '^' marker.", '');
  }

  /** "| include 패턴" 같은 출력 필터를 떼어 낸다 */
  splitFilter(text) {
    const bar = text.indexOf('|');
    if (bar < 0) return { command: text, filter: null };
    const command = text.slice(0, bar);
    const rest = text.slice(bar + 1);
    const tokens = tokenize(rest);
    if (!tokens.length) return { command, error: { start: text.length } };
    const word = tokens[0].text.toLowerCase();
    const matches = FILTERS.filter((f) => f.word.startsWith(word));
    if (matches.length !== 1 || tokens.length < 2) {
      return { command, error: { start: bar + 1 + tokens[0].start } };
    }
    const pattern = rest.slice(tokens[1].start).trim();
    let re;
    try {
      re = new RegExp(pattern);
    } catch {
      return { command, error: { start: bar + 1 + tokens[1].start } };
    }
    return { command, filter: { kind: matches[0].word, re } };
  }

  applyFilter(lines, { kind, re }) {
    if (kind === 'include') return lines.filter((l) => re.test(l));
    if (kind === 'exclude') return lines.filter((l) => !re.test(l));
    if (kind === 'begin') {
      const i = lines.findIndex((l) => re.test(l));
      return i < 0 ? [] : lines.slice(i);
    }
    // section: 일치하는 줄과 그 아래 들여쓴 줄
    const out = [];
    let inSection = false;
    for (const l of lines) {
      const indented = /^\s/.test(l);
      if (!indented) inSection = re.test(l);
      if (inSection || (!indented && re.test(l))) out.push(l);
    }
    return out;
  }

  runCli(raw) {
    const text = raw.replace(/\s+$/, '');
    if (!text.trim()) return;
    this.history.push(text.trim());
    if (this.history.length > HISTORY_SIZE) this.history.shift();

    const { command, filter, error } = this.splitFilter(text);
    if (error) {
      this.caretError(error);
      return;
    }

    let res = walk(TREES[this.mode], command);
    // 하위 설정 모드에서 전역 설정 명령을 입력하면 전역 설정 모드로 나가서 실행한다 (IOS 와 같음)
    if (res.error && res.tokenIndex === 0 && (this.mode === 'config-if' || this.mode === 'config-line')) {
      const global = walk(TREES.config, command);
      if (!global.error || global.tokenIndex > 0) {
        this.mode = 'config';
        this.sub = null;
        res = global;
      }
    }

    if (res.error === 'ambiguous') {
      this.print(`% Ambiguous command:  "${text.trim()}"`);
      return;
    }
    if (res.error) {
      if ((this.mode === 'user' || this.mode === 'priv') && res.tokenIndex === 0) {
        if (this.device.services.domainLookup) {
          this.print(`Translating "${res.errorToken.text}"...domain server (255.255.255.255)`);
        }
        this.print('% Unknown command or computer name, or unable to find computer address');
        return;
      }
      this.caretError(res.errorToken);
      return;
    }
    if (!res.node) return;

    const runner = runnerOf(res.node, isNegated(res.path));
    if (!runner) {
      this.print('% Incomplete command.', '');
      return;
    }

    if (filter) this.capture = [];
    try {
      runner(this.ctx(res), res.args);
    } finally {
      if (filter) {
        const lines = this.applyFilter(this.capture, filter);
        this.capture = null;
        if (lines.length) this.print(...lines);
      }
    }
  }

  /** ? 도움말 (입력 중인 줄 그대로). 화면에 출력할 줄 목록 */
  help(text) {
    if (text.includes('|')) {
      // 필터 이름을 입력하는 중이면 필터 목록, 필터 이름 뒤면 찾을 문자열
      const after = tokenize(text.slice(text.indexOf('|') + 1));
      const typingFilter = after.length === 0 || (after.length === 1 && !/\s$/.test(text));
      if (typingFilter) return formatHelp(FILTERS.map((f) => ({ label: f.word, help: f.help })));
      return ['  LINE  찾을 문자열 (정규식)'];
    }
    const res = treeHelp(TREES[this.mode], text);
    if (res.kind === 'list') return formatHelp(res.items);
    if (res.kind === 'words') return [res.words.join('  ')];
    if (res.error === 'unrecognized') return ['% Unrecognized command'];
    if (res.error === 'ambiguous') return [`% Ambiguous command:  "${text.trim()}"`];
    const pos = this.prompt.length + (res.errorToken?.start ?? 0);
    return [`${' '.repeat(pos)}^`, "% Invalid input detected at '^' marker."];
  }

  /** Tab 자동 완성. 완성할 수 없으면 null */
  complete(text) {
    return treeComplete(TREES[this.mode], text);
  }

  destroy() {
    clearTimeout(this.timer);
  }
}
