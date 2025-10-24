import { useState, useEffect } from 'react';
import axios from 'axios';
import { useUserAuth } from '../../context/UserAuthContext';
import { Link } from 'react-router-dom';

// 문의 및 답변에 대한 타입 정의
interface Inquiry {
  id: number;
  subject: string;
  content: string;
  status: 'SUBMITTED' | 'IN_PROGRESS' | 'RESOLVED';
  created_at: string;
  reply_content: string | null;
  reply_created_at: string | null;
}

// 날짜 포맷팅 함수
const formatDate = (dateString: string | null) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('ko-KR');
};

// 개별 문의 아이템 컴포넌트
const InquiryItem = ({ inquiry }: { inquiry: Inquiry }) => {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusText = (status: Inquiry['status']) => {
    switch (status) {
      case 'RESOLVED':
        return '답변 완료';
      case 'IN_PROGRESS':
        return '처리 중';
      case 'SUBMITTED':
      default:
        return '답변 대기';
    }
  };

  return (
    <div className="inquiry-item">
      <div className="inquiry-header" onClick={() => setIsOpen(!isOpen)}>
        <span className={`status-badge status-${inquiry.status.toLowerCase()}`}>
          {getStatusText(inquiry.status)}
        </span>
        <span className="inquiry-subject">{inquiry.subject}</span>
        <span className="inquiry-date">{formatDate(inquiry.created_at)}</span>
        <span className={`accordion-icon ${isOpen ? 'open' : ''}`}>▼</span>
      </div>
      {isOpen && (
        <div className="inquiry-body">
          <div className="inquiry-content-box">
            <h4>문의 내용</h4>
            <p>{inquiry.content}</p>
          </div>
          <div className="inquiry-content-box reply-box">
            <h4>답변 내용</h4>
            {inquiry.reply_content ? (
              <p>{inquiry.reply_content}</p>
            ) : (
              <p className="no-reply">아직 등록된 답변이 없습니다.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MyPage = () => {
  const { user } = useUserAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInquiries = async () => {
      try {
        const response = await axios.get('/api/user/me/inquiries');
        setInquiries(response.data);
      } catch (err) {
        console.error("Error fetching inquiries:", err);
        setError('문의 내역을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchInquiries();
  }, []);

  return (
    <div className="mypage-container">
      <header className="mypage-header">
        <h1>마이페이지</h1>
      </header>

      <section className="profile-section">
        <h2>내 정보</h2>
        <div className="profile-info">
          <p><strong>닉네임:</strong> {user?.nickname || '정보 없음'}</p>
          <p><strong>이메일:</strong> {user?.email || '정보 없음'}</p>
        </div>
        <Link to="/" className="edit-profile-btn">프로필 수정 (미구현)</Link>
      </section>

      <section className="inquiries-section">
        <h2>내 문의 내역</h2>
        {loading && <p>로딩 중...</p>}
        {error && <p className="error-message">{error}</p>}
        {!loading && !error && (
          inquiries.length > 0 ? (
            <div className="inquiry-list">
              {inquiries.map(inquiry => (
                <InquiryItem key={inquiry.id} inquiry={inquiry} />
              ))}
            </div>
          ) : (
            <p>작성한 문의 내역이 없습니다.</p>
          )
        )}
      </section>
    </div>
  );
};

export default MyPage;
