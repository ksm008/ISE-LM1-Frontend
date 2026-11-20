// 모드별 명령 트리. 설정 모드에는 no, do, exit, end 를 붙인다.
import { kw } from '../engine/tree.js';
import { doTree, privilegedExecTree, userExecTree } from './exec.js';
import { globalConfigTree } from './global.js';
import { interfaceTree } from './interface.js';
import { lineTree } from './line.js';

function configMode(children, exitTo) {
  const noNode = kw('no', '명령을 취소하거나 기본값으로 되돌림', children.filter((c) => c.noable !== false), {
    negates: true,
    noable: false,
  });
  return [
    ...children,
    kw('do', '설정 모드에서 EXEC 명령 실행 (예: do show running-config)', doTree(), { noable: false }),
    kw('end', '설정을 마치고 특권 모드로', [], { noable: false, run: (ctx) => ctx.session.endConfig() }),
    kw('exit', exitTo === 'priv' ? '설정을 마치고 특권 모드로' : '전역 설정 모드로', [], {
      noable: false,
      run: (ctx) => (exitTo === 'priv' ? ctx.session.endConfig() : ctx.enter('config')),
    }),
    noNode,
  ];
}

const sortTree = (nodes) => [...nodes].sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));

export const TREES = {
  user: sortTree(userExecTree()),
  priv: sortTree(privilegedExecTree()),
  config: sortTree(configMode(globalConfigTree(), 'priv')),
  'config-if': sortTree(configMode(interfaceTree(), 'config')),
  'config-line': sortTree(configMode(lineTree(), 'config')),
};
