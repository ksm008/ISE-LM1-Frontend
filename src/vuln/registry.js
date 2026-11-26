// 웹 취약점 실습 화면 목록: `${취약점 id}/${실습 id}` → 화면 (curriculum.js 의 vulnCategories 항목 lab 과 맞춤)
// 실습마다 따로 불러온다(sql.js 같은 큰 파일은 해당 실습을 열 때만 받음).
import { lazy } from 'react';

export const vulnLabComponents = {
  'sql-injection/form': lazy(() => import('./sqli/FormSqliLab.jsx')),
  'sql-injection/union': lazy(() => import('./sqli/UnionSqliLab.jsx')),
};
