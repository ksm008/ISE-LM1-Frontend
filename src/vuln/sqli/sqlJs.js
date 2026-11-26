// sql.js(SQLite WASM) 불러오기. 실습 페이지를 처음 열 때 한 번만 받는다.
import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url';

let loading = null;

export function loadSqlJs() {
  loading ??= initSqlJs({ locateFile: () => wasmUrl }).catch((e) => {
    loading = null; // 다음에 다시 시도
    throw e;
  });
  return loading;
}
