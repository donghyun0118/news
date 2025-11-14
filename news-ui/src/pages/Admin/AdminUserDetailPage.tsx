import axios from "axios";
import { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

interface User {
  id: number;
  email: string;
  nickname: string;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  warning_count: number;
  created_at: string;
}

const formatDateTime = (value?: string) => {
  if (!value) return "";
  return new Date(value).toLocaleString("ko-KR");
};

export default function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [editableStatus, setEditableStatus] = useState<User["status"]>("ACTIVE");
  const [editableWarningCount, setEditableWarningCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axios.get<User>(`/api/admin/users/${userId}`);
      setUser(res.data);
      setEditableStatus(res.data.status);
      setEditableWarningCount(res.data.warning_count);
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError("사용자 정보를 불러오는 데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveChanges = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await axios.patch(`/api/admin/users/${userId}`, {
        status: editableStatus,
        warning_count: editableWarningCount,
      });
      toast.success("사용자 정보가 성공적으로 업데이트되었습니다.");
      fetchData(); // Re-fetch to confirm changes
    } catch (err) {
      console.error("Error saving user data:", err);
      toast.error("정보 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="admin-container">로딩 중...</div>;
  }

  if (error) {
    return <div className="admin-container">{error}</div>;
  }

  if (!user) {
    return <div className="admin-container">사용자를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="admin-container">
      <header className="admin-page-header">
        <h1>사용자 상세 정보</h1>
        <Link to="/admin/users" className="back-link">
          ← 전체 사용자 목록으로
        </Link>
      </header>

      <div className="user-detail-card">
        <div className="user-detail-header">
          <h3>{user.nickname}</h3>
          <span>가입일: {formatDateTime(user.created_at)}</span>
        </div>
        <div className="user-detail-body">
          <div className="detail-item">
            <span className="item-label">고유 ID</span>
            <span className="item-value">{user.id}</span>
          </div>
          <div className="detail-item">
            <span className="item-label">이메일</span>
            <span className="item-value">{user.email}</span>
          </div>
          <div className="detail-item editable">
            <label htmlFor="status" className="item-label">계정 상태</label>
            <select
              id="status"
              className="item-input"
              value={editableStatus}
              onChange={(e) => setEditableStatus(e.target.value as User["status"])}
            >
              <option value="ACTIVE">활성</option>
              <option value="SUSPENDED">정지</option>
            </select>
          </div>
          <div className="detail-item editable">
            <label htmlFor="warning_count" className="item-label">경고 횟수</label>
            <input
              id="warning_count"
              type="number"
              className="item-input"
              value={editableWarningCount}
              onChange={(e) => setEditableWarningCount(parseInt(e.target.value, 10))}
              min="0"
            />
          </div>
        </div>
        <div className="user-detail-footer">
          <button onClick={handleSaveChanges} className="save-btn" disabled={isSaving}>
            {isSaving ? "저장 중..." : "변경사항 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
