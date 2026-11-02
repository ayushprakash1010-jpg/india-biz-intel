import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@gcc-quest/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/feature-flags')
export class FeatureFlagsController {
  constructor(private featureFlagsService: FeatureFlagsService) {}

  @Get('thresholds')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async getThresholds() {
    return this.featureFlagsService.getThresholds();
  }

  @Put('thresholds')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async updateThresholds(
    @Body() body: { analysisThreshold?: number; hunterThreshold?: number },
    @CurrentUser() user: any,
  ) {
    await this.featureFlagsService.setThresholds(body, user.id);
    return { success: true, ...body };
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async getAllFlags() {
    return this.featureFlagsService.getAllFlags();
  }

  @Put(':key')
  @Roles(UserRole.ADMIN)
  async toggleFlag(
    @Param('key') key: string,
    @Body('value') value: boolean,
    @CurrentUser() user: any,
  ) {
    await this.featureFlagsService.setFlag(key, value, user.id);
    return { success: true, key, value };
  }
}
