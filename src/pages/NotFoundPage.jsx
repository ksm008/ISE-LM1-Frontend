import { Link } from 'react-router';
import './Pages.css';

function NotFoundPage() {
  return (
    <div className="page">
      <header className="topic-header">
        <h1>페이지를 찾을 수 없습니다</h1>
        <p>주소가 바뀌었거나 존재하지 않는 페이지입니다.</p>
      </header>
      <Link to="/" className="btn btn--primary">
        홈으로 이동
      </Link>
    </div>
  );
}

export default NotFoundPage;
