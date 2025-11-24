// src/pages/Admin/AdminTopicCreatePage.tsx
import axios from "axios";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Topic } from "../../types";

const AdminTopicCreatePage = () => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState<Partial<Topic>>({
    display_name: "",
    embedding_keywords: "",
    summary: "",
    stance_left: "",
    stance_right: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTopic({ ...topic, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.display_name || !topic.embedding_keywords) {
      alert("대표 토픽명과 임베딩 키워드는 필수입니다.");
      return;
    }

    try {
      await axios.post(`/api/admin/topics`, {
        displayName: topic.display_name,
        searchKeywords: topic.embedding_keywords,
        summary: topic.summary || "",
        stanceLeft: topic.stance_left || "",
        stanceRight: topic.stance_right || "",
      });
      alert("새 토픽이 성공적으로 생성되었습니다. (준비 상태)");
      navigate("/admin"); // 저장 후 목록 페이지로 이동
    } catch (error) {
      console.error("Error creating topic:", error);
      alert("새 토픽 생성에 실패했습니다.");
    }
  };

  return (
    <div className="admin-container">
      <Link to="/admin" className="back-link">
        ← 목록으로
      </Link>
      <h1>새 ROUND2 토픽 생성</h1>
      <form onSubmit={handleSubmit} className="topic-edit-form">
        <div className="edit-field">
          <label htmlFor="display_name">토픽 주제</label>
          <input type="text" name="display_name" value={topic.display_name || ""} onChange={handleChange} required />
        </div>
        <div className="edit-field">
          <label htmlFor="embedding_keywords">임베딩 키워드 (쉼표로 구분)</label>
          <input
            type="text"
            name="embedding_keywords"
            value={topic.embedding_keywords || ""}
            onChange={handleChange}
            required
          />
        </div>
        <div className="edit-field">
          <label htmlFor="stance_left">LEFT 주장</label>
          <input type="text" name="stance_left" value={topic.stance_left || ""} onChange={handleChange} />
        </div>
        <div className="edit-field">
          <label htmlFor="stance_right">RIGHT 주장</label>
          <input type="text" name="stance_right" value={topic.stance_right || ""} onChange={handleChange} />
        </div>
        <div className="edit-field">
          <label htmlFor="summary">토픽 요약</label>
          <textarea name="summary" value={topic.summary || ""} onChange={handleChange} rows={5}></textarea>
        </div>
        <button type="submit" className="save-btn">
          토픽 생성 (준비)
        </button>
      </form>
    </div>
  );
};

export default AdminTopicCreatePage;
