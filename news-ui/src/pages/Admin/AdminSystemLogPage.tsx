import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
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
        transformResponse: (res) => res,
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">시스템 로그</h1>
            <Link to="/admin">
              <Button variant="outline">← 대시보드</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Log File Selector */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">로그 파일 선택</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logFiles.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => handleLogSelect(file)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      selectedLog?.path === file.path
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    {file.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Log Content Viewer */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>{selectedLog?.name || "로그 선택"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm overflow-auto max-h-[600px]">
                {isLoading && <p>로그를 불러오는 중...</p>}
                {error && <pre className="text-red-400">{error}</pre>}
                {!isLoading && !error && <pre>{logContent || "표시할 내용이 없습니다."}</pre>}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
