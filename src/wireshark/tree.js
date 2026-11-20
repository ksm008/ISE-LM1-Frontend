/** offset 바이트를 포함하는 가장 깊은 상세 트리 노드까지의 경로 */
export function findNodePath(tree, offset) {
  for (const item of tree) {
    if (item.length > 0 && offset >= item.start && offset < item.start + item.length) {
      return [item, ...findNodePath(item.children, offset)];
    }
  }
  return [];
}
