// 패킷 바이트 (16진수 + ASCII). 상세 트리에서 고른 항목의 바이트를 강조한다.

const printable = (b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.');
const BYTES_PER_LINE = 16;

function PacketBytes({ bytes, highlight, onSelectOffset }) {
  if (!bytes) return <div className="ws-pane__empty">패킷을 선택하면 실제 바이트가 표시됩니다.</div>;

  const hlStart = highlight?.length ? highlight.start : -1;
  const hlEnd = highlight?.length ? highlight.start + highlight.length : -1;
  const lineStarts = Array.from({ length: Math.ceil(bytes.length / BYTES_PER_LINE) }, (_, i) => i * BYTES_PER_LINE);
  const cellClass = (i) => (i >= hlStart && i < hlEnd ? 'is-hl' : undefined);

  return (
    <div className="ws-bytes">
      {lineStarts.map((row) => {
        const offsets = Array.from({ length: BYTES_PER_LINE }, (_, k) => row + k);
        return (
          <div key={row} className="ws-bytes__line">
            <span className="ws-bytes__offset">{row.toString(16).padStart(4, '0')}</span>
            <span className="ws-bytes__hex">
              {offsets.map((i) =>
                i < bytes.length ? (
                  <span key={i} className={cellClass(i)} onMouseDown={() => onSelectOffset(i)}>
                    {bytes[i].toString(16).padStart(2, '0')}
                  </span>
                ) : (
                  <span key={i} className="ws-bytes__pad" />
                ),
              )}
            </span>
            <span className="ws-bytes__ascii">
              {offsets
                .filter((i) => i < bytes.length)
                .map((i) => (
                  <span key={i} className={cellClass(i)} onMouseDown={() => onSelectOffset(i)}>
                    {printable(bytes[i])}
                  </span>
                ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default PacketBytes;
