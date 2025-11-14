import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface LogFile {
  name: string;
  path: string;
}

export default function AdminSystemLogPage() {
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogFile | null>(null);
  const [logContent, setLogContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogFiles = async () => {
      try {
        const response = await axios.get<LogFile[]>("/api/admin/logs");
        setLogFiles(response.data);
        // Automatically select the first log file if available
        if (response.data.length > 0) {
          handleLogSelect(response.data[0]);
        }
      } catch (err) {
        setError("로그 파일 목록을 불러오는 데 실패했습니다.");
        console.error(err);
      }
    };

    fetchLogFiles();
  }, []);

  const handleLogSelect = async (logFile: LogFile) => {
    setSelectedLog(logFile);
    setIsLoading(true);
    setError(null);
    setLogContent("");
    try {
      const response = await axios.get("/api/admin/logs/view", {
        params: { path: logFile.path },
        transformResponse: (res) => res, // Prevent axios from parsing it as JSON
      });
      setLogContent(response.data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError(`'${logFile.name}' 로그 파일을 불러오는 데 실패했습니다: ${err.response.status} ${err.response.data}`);
      } else {
        setError(`'${logFile.name}' 로그 파일을 불러오는 데 실패했습니다.`);
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-container admin-system-log-page">
      <header className="admin-page-header">
        <h1>시스템 로그</h1>
        <Link to="/admin" className="back-link">
          ← 대시보드로 돌아가기
        </Link>
      </header>

      <div className="log-viewer-layout">
        <div className="log-selector">
          <h4>로그 파일 선택</h4>
          <div className="log-file-list">
            {logFiles.map((file) => (
              <button
                key={file.path}
                className={`log-file-btn ${selectedLog?.path === file.path ? "active" : ""}`}
                onClick={() => handleLogSelect(file)}
              >
                {file.name}
              </button>
            ))}
          </div>
        </div>

        <div className="log-content-container">
          {selectedLog && <h3>{selectedLog.name}</h3>}
          <div className="log-content-viewer">
            {isLoading && <p>로그를 불러오는 중...</p>}
            {error && <pre className="log-error">{error}</pre>}
            {!isLoading && !error && <pre>{logContent || "표시할 내용이 없습니다."}</pre>}
          </div>
        </div>
      </div>
    </div>
  );
}
