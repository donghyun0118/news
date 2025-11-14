import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Pagination from "../../components/Pagination";

interface Inquiry {
  id: number;
  subject: string;
  status: "SUBMITTED" | "IN_PROGRESS" | "RESOLVED";
  created_at: string;
  user_nickname: string;
}

const ITEMS_PER_PAGE = 20;

const formatDateTime = (value?: string) => {
  if (!value) return "";
  return new Date(value).toLocaleString("ko-KR");
};

const getStatusText = (status: Inquiry["status"]) => {
  switch (status) {
    case "SUBMITTED":
      return "답변 대기";
    case "IN_PROGRESS":
      return "답변 중";
    case "RESOLVED":
      return "답변 완료";
    default:
      return status;
  }
};

export default function AdminInquiriesListPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInquiries = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const offset = (currentPage - 1) * ITEMS_PER_PAGE;
        const response = await axios.get(`/api/admin/inquiries`, {
          params: {
            limit: ITEMS_PER_PAGE,
            offset: offset,
          },
        });
        // 참고: 현재 API는 전체 카운트를 반환하지 않으므로, 임시로 처리합니다.
        // 추후 API가 X-Total-Count 헤더 등을 반환하면 그 값을 사용해야 합니다.
        setInquiries(response.data);
        if (currentPage === 1 && response.data.length < ITEMS_PER_PAGE) {
          setTotalCount(response.data.length);
        } else if (response.data.length === 0 && currentPage > 1) {
          // 마지막 페이지 너머로 갔을 경우, 마지막 페이지로 이동
          setCurrentPage(currentPage - 1);
        } else {
          // 전체 카운트를 알 수 없으므로, 다음 페이지가 있는 것처럼 가정
          setTotalCount(currentPage * ITEMS_PER_PAGE + 1);
        }
      } catch (err) {
        setError("문의 목록을 불러오는 데 실패했습니다.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInquiries();
  }, [currentPage]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="admin-container">
      <header className="admin-page-header">
        <h1>전체 문의 목록</h1>
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
                <th>상태</th>
                <th>제목</th>
                <th>작성자</th>
                <th>문의 시각</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.length > 0 ? (
                inquiries.map((inquiry) => (
                  <tr key={inquiry.id}>
                    <td>
                      <span className={`status-badge status-${inquiry.status.toLowerCase()}`}>
                        {getStatusText(inquiry.status)}
                      </span>
                    </td>
                    <td>{inquiry.subject}</td>
                    <td>{inquiry.user_nickname}</td>
                    <td>{formatDateTime(inquiry.created_at)}</td>
                    <td>
                      <Link to={`/admin/inquiries/${inquiry.id}`} className="table-action-btn">
                        상세 보기
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>받은 문의가 없습니다.</td>
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
