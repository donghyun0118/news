import {
  Body,
  Controller,
  Get,
  ParseArrayPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ChangePasswordDto } from './dto/change-password.dto';
import { NotificationSettingDto } from './dto/notification-setting.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserService } from './user.service';

interface AuthenticatedRequest extends Request {
  user: { userId: number; name: string };
}

@ApiTags('Users')
@Controller('api')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('avatars')
  @ApiOperation({
    summary: '선택 가능한 프로필 아바타 목록 조회',
    description:
      '사용자가 프로필 사진으로 선택할 수 있는 모든 아바타 이미지의 절대 URL 목록을 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '아바타 이미지 URL 배열' })
  async getAvatars(@Req() req: Request) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.userService.getAvatars(baseUrl);
  }

  @Get('user/me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: '내 프로필 조회',
    description: '현재 로그인한 사용자의 기본 정보를 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '프로필 정보 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async getProfile(@Req() req: AuthenticatedRequest) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.userService.getProfile(req.user.userId, baseUrl);
  }

  @Put('user/me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: '내 프로필 수정',
    description:
      '닉네임, 프로필 이미지, 자기소개 등 현재 로그인한 사용자의 정보를 수정합니다.',
  })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({
    status: 200,
    description: '프로필 정보가 성공적으로 업데이트됨',
  })
  @ApiResponse({ status: 400, description: '요청 본문 유효성 검증 실패' })
  @ApiResponse({ status: 409, description: '닉네임 중복' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.userService.updateProfile(
      req.user.userId,
      updateProfileDto,
      baseUrl,
    );
  }

  @Put('user/me/password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: '비밀번호 변경',
    description: '현재 비밀번호를 확인하고 새 비밀번호로 변경합니다.',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: '비밀번호가 성공적으로 변경됨' })
  @ApiResponse({ status: 400, description: '요청 본문 유효성 검증 실패' })
  @ApiResponse({ status: 401, description: '현재 비밀번호가 일치하지 않음' })
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(req.user.userId, changePasswordDto);
  }

  @Post('user/me/delete')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: '회원 탈퇴',
    description:
      '사용자 계정을 비활성화(탈퇴) 처리합니다. 보안을 위해 현재 비밀번호를 확인합니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['password'],
      properties: {
        password: {
          type: 'string',
          description: '현재 비밀번호',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: '회원 탈퇴 처리가 완료됨' })
  @ApiResponse({ status: 401, description: '인증 실패 또는 비밀번호 불일치' })
  async deleteAccount(
    @Req() req: AuthenticatedRequest,
    @Body('password') password: string,
  ) {
    return this.userService.deleteAccount(req.user.userId, password);
  }

  @Get('user/me/notification-settings')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: '알림 설정 조회',
    description:
      '현재 로그인한 사용자의 알림 유형별 사용 여부를 반환합니다. 설정한 값이 없으면 기본값(true)을 제공합니다.',
  })
  @ApiResponse({ status: 200, description: '알림 설정 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async getNotificationSettings(@Req() req: AuthenticatedRequest) {
    return this.userService.getNotificationSettings(req.user.userId);
  }

  @Put('user/me/notification-settings')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: '알림 설정 업데이트',
    description:
      '알림 유형별 사용 여부를 일괄로 업데이트합니다. 배열 형태의 설정 값을 전달해야 합니다.',
  })
  @ApiBody({
    type: NotificationSettingDto,
    isArray: true,
  })
  @ApiResponse({ status: 200, description: '알림 설정 업데이트 성공' })
  @ApiResponse({ status: 400, description: '요청 형식이 올바르지 않음' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async updateNotificationSettings(
    @Req() req: AuthenticatedRequest,
    @Body(
      new ParseArrayPipe({
        items: NotificationSettingDto,
        whitelist: true,
      }),
    )
    settings: NotificationSettingDto[],
  ) {
    return this.userService.updateNotificationSettings(
      req.user.userId,
      settings,
    );
  }
}
