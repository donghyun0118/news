import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Pagination from "../../components/Pagination";
import type { Topic } from "../../types";

const ITEMS_PER_PAGE = 20;

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR");
};

const getStatusText = (status: Topic["status"]) => {
  switch (status) {
    case "OPEN":
      return "발행됨";
    case "PREPARING":
      return "준비 중";
    case "CLOSED":
      return "종료됨";
    default:
      return status || "-";
  }
};

type TabType = "PREPARING" | "OPEN" | "ALL";

export default function AdminTopicsListPage() {
  const location = useLocation();
  const initialTab = (location.state as { initialTab?: TabType })?.initialTab || "ALL";

  const [topics, setTopics] = useState<Topic[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({ ALL: 0, OPEN: 0, PREPARING: 0, CLOSED: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  useEffect(() => {
    const fetchTopics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params: { limit: number; page: number; status?: TabType } = {
          limit: ITEMS_PER_PAGE,
          page: currentPage,
        };
        if (activeTab !== "ALL") {
          params.status = activeTab;
        }

        const response = await axios.get(`/api/admin/topics`, { params });
        setTopics(response.data.topics);
        setTotalCount(response.data.total);
        if (response.data.counts) {
          setCounts(response.data.counts);
        }
      } catch (err) {
        setError("토픽 목록을 불러오는 데 실패했습니다.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopics();
  }, [currentPage, activeTab]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset to first page when changing tabs
  };

  return (
    <div className="admin-container">
      <header className="admin-page-header">
        <div>
          <h1>전체 토픽 목록</h1>
        </div>
        <div className="admin-page-actions">
          <Link to="/admin/topics/new" className="create-new-topic-btn">
            + 새 토픽 생성
          </Link>
          <Link to="/admin" className="back-link">
            ← 대시보드로 돌아가기
          </Link>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="tabs-container" style={{ marginBottom: "20px" }}>
        <button
          type="button"
          className={`tab-button ${activeTab === "ALL" ? "active" : ""}`}
          onClick={() => handleTabChange("ALL")}
        >
          전체 ({counts.ALL})
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === "OPEN" ? "active" : ""}`}
          onClick={() => handleTabChange("OPEN")}
        >
          발행됨 ({counts.OPEN})
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === "PREPARING" ? "active" : ""}`}
          onClick={() => handleTabChange("PREPARING")}
        >
          준비 중 ({counts.PREPARING})
        </button>
      </div>

      <div className="admin-table-container">
        {isLoading && <p>로딩 중...</p>}
        {error && <p className="error-message">{error}</p>}
        {!isLoading && !error && (
          <table>
            <thead>
              <tr>
                <th>상태</th>
                <th>토픽 이름</th>
                <th>검색 키워드</th>
                <th>발행일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {topics.length > 0 ? (
                topics.map((topic) => (
                  <tr key={topic.id}>
                    <td>
                      <span className={`status-badge status-${topic.status?.toLowerCase()}`}>
                        {getStatusText(topic.status)}
                      </span>
                    </td>
                    <td>
                      <strong>{topic.display_name || topic.core_keyword}</strong>
                    </td>
                    <td>{topic.search_keywords || topic.embedding_keywords}</td>
                    <td>{formatDateTime(topic.published_at)}</td>
                    <td>
                      <Link to={`/admin/topics/${topic.id}`} className="table-action-btn">
                        {topic.status === "PREPARING" ? "큐레이션" : "관리"}
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    {activeTab === "PREPARING" && "준비 중인 토픽이 없습니다."}
                    {activeTab === "OPEN" && "발행된 토픽이 없습니다."}
                    {activeTab === "ALL" && "생성된 토픽이 없습니다."}
                  </td>
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
