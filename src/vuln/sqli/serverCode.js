// 실습별 서버 코드 예시 (PHP / Java). vulnerable = 취약한 코드, safe = 보안 코딩 적용
// 화면의 "서버 코드" 창에서 언어 탭으로 바꿔 본다 (SqliLabParts.jsx ServerCode)

export const CODE_LANGS = [
  { id: 'php', label: 'PHP' },
  { id: 'java', label: 'Java' },
];

const MYBATIS_NOTE = `// MyBatis 를 쓴다면: #{id} 는 PreparedStatement 바인딩(안전),
//                   \${id} 는 문자열을 그대로 이어 붙임(취약)`;

export const SERVER_CODE = {
  form: {
    php: {
      vulnerable: `<?php
$id = $_POST['username'];
$pw = $_POST['password'];

// 입력값을 SQL 문자열에 그대로 이어 붙인다 (취약)
$sql = "SELECT id, username, name, role FROM members
        WHERE username = '$id' AND password = '$pw'";
$result = mysqli_query($conn, $sql);

if ($row = mysqli_fetch_assoc($result)) {   // 첫 번째 행으로 로그인
    $_SESSION['user'] = $row['username'];
}`,
      safe: `<?php
$id = $_POST['username'];
$pw = $_POST['password'];

// SQL 구조는 고정하고, 입력값은 값으로만 전달한다
$stmt = mysqli_prepare($conn, "SELECT id, username, name, role FROM members
                               WHERE username = ? AND password = ?");
mysqli_stmt_bind_param($stmt, "ss", $id, $pw);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);
// 실제 서비스: 비밀번호는 password_hash() 로 저장하고 password_verify() 로 비교`,
    },
    java: {
      vulnerable: `String id = request.getParameter("username");
String pw = request.getParameter("password");

// 입력값을 SQL 문자열에 그대로 이어 붙인다 (취약)
String sql = "SELECT id, username, name, role FROM members "
           + "WHERE username = '" + id + "' AND password = '" + pw + "'";
Statement stmt = conn.createStatement();
ResultSet rs = stmt.executeQuery(sql);

if (rs.next()) {                              // 첫 번째 행으로 로그인
    session.setAttribute("user", rs.getString("username"));
}`,
      safe: `String id = request.getParameter("username");
String pw = request.getParameter("password");

// SQL 구조는 고정하고(? 자리표시자), 입력값은 값으로만 전달한다
String sql = "SELECT id, username, name, role FROM members "
           + "WHERE username = ? AND password = ?";
try (PreparedStatement ps = conn.prepareStatement(sql)) {
    ps.setString(1, id);
    ps.setString(2, pw);
    try (ResultSet rs = ps.executeQuery()) {
        if (rs.next()) session.setAttribute("user", rs.getString("username"));
    }
}
// 실제 서비스: 비밀번호는 BCrypt 등으로 해시해 저장하고 비교
${MYBATIS_NOTE}`,
    },
  },

  union: {
    php: {
      vulnerable: `<?php
$q = $_GET['q'];

// 검색어를 LIKE 조건에 그대로 이어 붙인다 (취약)
$sql = "SELECT id, title, writer, created FROM posts
        WHERE title LIKE '%$q%' ORDER BY id DESC";
$result = mysqli_query($conn, $sql);

while ($row = mysqli_fetch_row($result)) {
    // 결과 4개 컬럼을 번호·제목·작성자·작성일 칸에 그대로 출력
    echo "<tr><td>$row[0]</td><td>$row[1]</td><td>$row[2]</td><td>$row[3]</td></tr>";
}`,
      safe: `<?php
$q = $_GET['q'];

// SQL 구조는 고정하고, 검색어는 값으로만 전달한다
$stmt = mysqli_prepare($conn, "SELECT id, title, writer, created FROM posts
                               WHERE title LIKE ? ORDER BY id DESC");
$like = "%" . $q . "%";
mysqli_stmt_bind_param($stmt, "s", $like);
mysqli_stmt_execute($stmt);
// 출력할 때는 htmlspecialchars() 로 이스케이프 (XSS 대응)`,
    },
    java: {
      vulnerable: `String q = request.getParameter("q");

// 검색어를 LIKE 조건에 그대로 이어 붙인다 (취약)
String sql = "SELECT id, title, writer, created FROM posts "
           + "WHERE title LIKE '%" + q + "%' ORDER BY id DESC";
Statement stmt = conn.createStatement();
ResultSet rs = stmt.executeQuery(sql);

while (rs.next()) {
    // 결과 4개 컬럼을 번호·제목·작성자·작성일 칸에 그대로 출력
    out.println("<tr><td>" + rs.getString(1) + "</td><td>" + rs.getString(2)
              + "</td><td>" + rs.getString(3) + "</td><td>" + rs.getString(4) + "</td></tr>");
}`,
      safe: `String q = request.getParameter("q");

// SQL 구조는 고정하고, 검색어는 값으로만 전달한다 (% 는 값 쪽에 붙임)
String sql = "SELECT id, title, writer, created FROM posts "
           + "WHERE title LIKE ? ORDER BY id DESC";
try (PreparedStatement ps = conn.prepareStatement(sql)) {
    ps.setString(1, "%" + q + "%");
    try (ResultSet rs = ps.executeQuery()) { /* ... */ }
}
// 출력할 때는 HTML 이스케이프 (XSS 대응)
${MYBATIS_NOTE}
// 예) LIKE CONCAT('%', #{q}, '%')`,
    },
  },

  'stored-procedure': {
    php: {
      vulnerable: `-- 저장 프로시저 (MS-SQL 예)
CREATE PROCEDURE sp_find_member @name NVARCHAR(50)
AS
BEGIN
    -- 프로시저 안에서 입력값을 이어 붙여 동적 SQL 을 만든다 (취약)
    DECLARE @sql NVARCHAR(500);
    SET @sql = 'SELECT username, name, email FROM members WHERE name = '''
               + @name + '''';
    EXEC (@sql);
END

<?php
// 호출은 바인딩해도, 프로시저 안이 취약하면 소용없다
$stmt = sqlsrv_query($conn, "{call sp_find_member(?)}", [$_GET['name']]);`,
      safe: `-- 방법 1: 동적 SQL 을 쓰지 않는다 (정적 SQL)
CREATE PROCEDURE sp_find_member @name NVARCHAR(50)
AS
BEGIN
    SELECT username, name, email FROM members WHERE name = @name;
END

-- 방법 2: 동적 SQL 이 꼭 필요하면 sp_executesql 로 파라미터 바인딩
-- EXEC sp_executesql N'SELECT ... WHERE name = @n', N'@n NVARCHAR(50)', @n = @name;
-- 그리고 웹 계정에는 필요한 프로시저 실행 권한만 준다 (최소 권한)

<?php
$stmt = sqlsrv_query($conn, "{call sp_find_member(?)}", [$_GET['name']]);`,
    },
    java: {
      vulnerable: `-- 저장 프로시저 (MS-SQL 예)
CREATE PROCEDURE sp_find_member @name NVARCHAR(50)
AS
BEGIN
    -- 프로시저 안에서 입력값을 이어 붙여 동적 SQL 을 만든다 (취약)
    DECLARE @sql NVARCHAR(500);
    SET @sql = 'SELECT username, name, email FROM members WHERE name = '''
               + @name + '''';
    EXEC (@sql);
END

// Java: CallableStatement 로 바인딩해서 호출해도, 프로시저 안이 취약하면 소용없다
try (CallableStatement cs = conn.prepareCall("{call sp_find_member(?)}")) {
    cs.setString(1, request.getParameter("name"));
    ResultSet rs = cs.executeQuery();
}`,
      safe: `-- 방법 1: 동적 SQL 을 쓰지 않는다 (정적 SQL)
CREATE PROCEDURE sp_find_member @name NVARCHAR(50)
AS
BEGIN
    SELECT username, name, email FROM members WHERE name = @name;
END

-- 방법 2: 동적 SQL 이 꼭 필요하면 sp_executesql 로 파라미터 바인딩
-- EXEC sp_executesql N'SELECT ... WHERE name = @n', N'@n NVARCHAR(50)', @n = @name;

// Java 호출 쪽은 CallableStatement 바인딩 유지
// (호출 문자열을 "{call sp_find_member('" + name + "')}" 처럼 이어 붙이면 그 자체로 취약)
try (CallableStatement cs = conn.prepareCall("{call sp_find_member(?)}")) {
    cs.setString(1, request.getParameter("name"));
    ResultSet rs = cs.executeQuery();
}`,
    },
  },

  'error-based': {
    php: {
      vulnerable: `<?php
$id = $_GET['id'];

// 숫자 파라미터라 따옴표 없이 이어 붙인다 (취약)
$sql = "SELECT id, title, writer, created FROM posts WHERE id = $id";
$result = mysqli_query($conn, $sql);

if (!$result) {
    // DB 오류를 그대로 화면에 출력한다 (정보 노출)
    die("DB 오류: " . mysqli_error($conn));
}`,
      safe: `<?php
$id = $_GET['id'];
if (!ctype_digit($id)) { http_response_code(400); exit('잘못된 요청입니다.'); }  // 입력 검증

$stmt = mysqli_prepare($conn, "SELECT id, title, writer, created FROM posts WHERE id = ?");
mysqli_stmt_bind_param($stmt, "i", $id);

try {
    mysqli_stmt_execute($stmt);
} catch (mysqli_sql_exception $e) {
    error_log($e->getMessage());               // 자세한 내용은 서버 로그에만
    exit('요청을 처리하지 못했습니다.');          // 사용자에게는 일반 안내
}
// php.ini: display_errors = Off`,
    },
    java: {
      vulnerable: `String id = request.getParameter("id");

// 숫자 파라미터라 따옴표 없이 이어 붙인다 (취약)
String sql = "SELECT id, title, writer, created FROM posts WHERE id = " + id;
try {
    ResultSet rs = conn.createStatement().executeQuery(sql);
} catch (SQLException e) {
    // DB 오류를 그대로 화면에 출력한다 (정보 노출)
    out.println("DB 오류: " + e.getMessage());
    e.printStackTrace(response.getWriter());   // 스택 트레이스 노출도 위험
}`,
      safe: `long id;
try {
    id = Long.parseLong(request.getParameter("id"));     // 입력 검증 (숫자만)
} catch (NumberFormatException e) {
    response.sendError(400, "잘못된 요청입니다.");
    return;
}

String sql = "SELECT id, title, writer, created FROM posts WHERE id = ?";
try (PreparedStatement ps = conn.prepareStatement(sql)) {
    ps.setLong(1, id);
    ResultSet rs = ps.executeQuery();
} catch (SQLException e) {
    log.error("게시글 조회 실패", e);                     // 자세한 내용은 서버 로그에만
    response.sendError(500, "요청을 처리하지 못했습니다.");  // 사용자에게는 일반 안내
}
// web.xml <error-page> / Spring 전역 예외 처리로 오류 페이지 통일`,
    },
  },
};
