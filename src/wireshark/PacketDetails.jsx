// 패킷 상세 트리. 펼친 상태는 노드 key 로 기억해서, 다른 패킷을 골라도 같은 항목이 펼쳐져 있다.

function TreeNode({ item, depth, expanded, onToggle, selected, onSelect }) {
  const hasChildren = item.children.length > 0;
  const open = hasChildren && expanded.has(item.key);
  const isSelected = selected && selected.key === item.key && selected.start === item.start;

  return (
    <li role="treeitem" aria-expanded={hasChildren ? open : undefined} aria-selected={isSelected}>
      <div
        className={`ws-tree__row${isSelected ? ' is-selected' : ''}`}
        style={{ paddingLeft: 4 + depth * 16 }}
        onMouseDown={() => onSelect(item)}
        onDoubleClick={() => hasChildren && onToggle(item.key)}
      >
        <span
          className={`ws-tree__arrow${hasChildren ? '' : ' is-leaf'}`}
          onMouseDown={(e) => {
            e.stopPropagation();
            onSelect(item);
            if (hasChildren) onToggle(item.key);
          }}
        >
          {hasChildren ? (open ? '▾' : '▸') : ''}
        </span>
        {item.label}
      </div>
      {open && (
        <ul role="group">
          {item.children.map((child, i) => (
            <TreeNode
              key={`${child.key}-${i}`}
              item={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function PacketDetails({ tree, expanded, onToggle, selected, onSelect }) {
  if (!tree) return <div className="ws-pane__empty">패킷을 선택하면 계층별 상세 정보가 표시됩니다.</div>;
  return (
    <ul className="ws-tree" role="tree" aria-label="패킷 상세">
      {tree.map((item, i) => (
        <TreeNode
          key={`${item.key}-${i}`}
          item={item}
          depth={0}
          expanded={expanded}
          onToggle={onToggle}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}

export default PacketDetails;
