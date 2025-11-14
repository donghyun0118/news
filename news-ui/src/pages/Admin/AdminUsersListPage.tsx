import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Pagination from "../../components/Pagination";

interface User {
  id: number;
  email: string;
  nickname: string;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  warning_count: number;
  created_at: string;
}

const ITEMS_PER_PAGE = 20;

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR");
};

const getStatusText = (status: User["status"]) => {
  switch (status) {
    case "ACTIVE":
      return "활성";
    case "SUSPENDED":
      return "정지";
    case "DELETED":
      return "탈퇴";
    default:
      return status;
  }
};

export default function AdminUsersListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get(`/api/admin/users`, {
          params: {
            limit: ITEMS_PER_PAGE,
            page: currentPage,
          },
        });
        setUsers(response.data.users);
        setTotalCount(response.data.total);
      } catch (err) {
        setError("사용자 목록을 불러오는 데 실패했습니다.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [currentPage]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="admin-container">
      <header className="admin-page-header">
        <h1>전체 사용자 목록</h1>
        <Link to="/admin" className="back-link">
          ← 대시보드로 돌아가기
        </Link>
      </header>

      <div className="admin-table-container">
        {isLoading && <p>로딩 중...</p>}
        {error && <p className="error-message">{error}</p>}
        {!isLoading && !error && (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>닉네임</th>
                <th>이메일</th>
                <th>상태</th>
                <th>경고</th>
                <th>가입일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.nickname}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`status-badge status-${user.status.toLowerCase()}`}>
                        {getStatusText(user.status)}
                      </span>
                    </td>
                    <td>{user.warning_count}</td>
                    <td>{formatDateTime(user.created_at)}</td>
                    <td>
                      <Link to={`/admin/users/${user.id}`} className="table-action-btn">
                        관리
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>가입한 사용자가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
}
