import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
            <div className="flex items-center gap-4">
              <Badge variant="success">시스템 정상</Badge>
              <Button variant="outline" size="sm">
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">총 토픽</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">1,234</div>
              <p className="text-sm text-green-600 mt-1">+12% 이번 달</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">활성 사용자</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">5,678</div>
              <p className="text-sm text-green-600 mt-1">+8% 이번 달</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">총 기사</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">45,890</div>
              <p className="text-sm text-blue-600 mt-1">+156 오늘</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">대기 중인 토픽</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">23</div>
              <p className="text-sm text-yellow-600 mt-1">검토 필요</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Topics Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>최근 토픽</CardTitle>
            <Button size="sm">전체 보기</Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">제목</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">상태</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">타입</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">조회수</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">작업</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">윤석열 대통령 탄핵 논란</td>
                    <td className="py-3 px-4">
                      <Badge variant="success">발행됨</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge>VOTING</Badge>
                    </td>
                    <td className="py-3 px-4">12,345</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          수정
                        </Button>
                        <Button variant="ghost" size="sm">
                          삭제
                        </Button>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">경제 위기 대응 방안</td>
                    <td className="py-3 px-4">
                      <Badge variant="warning">준비 중</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge>VOTING</Badge>
                    </td>
                    <td className="py-3 px-4">8,901</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          수정
                        </Button>
                        <Button variant="ghost" size="sm">
                          삭제
                        </Button>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">이재명</td>
                    <td className="py-3 px-4">
                      <Badge variant="success">발행됨</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="default">KEYWORD</Badge>
                    </td>
                    <td className="py-3 px-4">5,432</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          수정
                        </Button>
                        <Button variant="ghost" size="sm">
                          삭제
                        </Button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">새 토픽 생성</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm mb-4">투표 토픽을 생성하고 기사를 큐레이션하세요</p>
              <Button className="w-full">생성하기</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">키워드 채팅방</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm mb-4">새로운 키워드 채팅방을 추가하세요</p>
              <Button className="w-full">추가하기</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">기사 수집</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm mb-4">최신 기사를 수집하고 분류하세요</p>
              <Button className="w-full">수집 시작</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
