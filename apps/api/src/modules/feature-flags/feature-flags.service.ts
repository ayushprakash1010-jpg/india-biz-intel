import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { SettingsCacheService } from '../../common/cache/settings-cache.service';

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);

  // In a real app we would cache this in Redis.
  // For Sprint 1, we fetch from DB or memory cache.
  private cache: Record<string, { value: boolean; expiresAt: number }> = {};

  constructor(
    private prisma: PrismaService,
    private settingsCache: SettingsCacheService,
  ) {}

  async isEnabled(flag: string): Promise<boolean> {
    const now = Date.now();
    if (this.cache[flag] && this.cache[flag].expiresAt > now) {
      return this.cache[flag].value;
    }

    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: flag },
    });

    const isEnabled = setting ? setting.value === 'true' : false;

    // Cache for 60s
    this.cache[flag] = {
      value: isEnabled,
      expiresAt: now + 60000,
    };

    return isEnabled;
  }

  async setFlag(flag: string, value: boolean, userId?: string): Promise<void> {
    await this.prisma.systemSetting.update({
      where: { key: flag },
      data: {
        value: value ? 'true' : 'false',
        updatedBy: userId,
      },
    });

    // Invalidate cache
    delete this.cache[flag];
    this.logger.log(`Feature flag ${flag} set to ${value}`);
  }

  async getAllFlags(): Promise<Record<string, boolean>> {
    const flags = await this.prisma.systemSetting.findMany({
      where: { key: { startsWith: 'feature.' } },
    });

    return flags.reduce(
      (acc: Record<string, boolean>, flag: { key: string; value: string }) => {
        acc[flag.key] = flag.value === 'true';
        return acc;
      },
      {} as Record<string, boolean>,
    );
  }

  async getThresholds(): Promise<{
    analysisThreshold: number;
    hunterThreshold: number;
  }> {
    const [analysisSetting, hunterSetting] = await Promise.all([
      this.prisma.systemSetting.findUnique({
        where: { key: 'config.analysis_threshold' },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: 'config.hunter_threshold' },
      }),
    ]);

    return {
      analysisThreshold: analysisSetting
        ? parseFloat(analysisSetting.value)
        : 8.5,
      hunterThreshold: hunterSetting ? parseFloat(hunterSetting.value) : 7.0,
    };
  }

  async setThresholds(
    thresholds: { analysisThreshold?: number; hunterThreshold?: number },
    userId?: string,
  ): Promise<void> {
    if (thresholds.analysisThreshold !== undefined) {
      await this.prisma.systemSetting.upsert({
        where: { key: 'config.analysis_threshold' },
        update: {
          value: thresholds.analysisThreshold.toString(),
          updatedBy: userId,
        },
        create: {
          key: 'config.analysis_threshold',
          value: thresholds.analysisThreshold.toString(),
          description: 'Min businessImpact to trigger generation',
          updatedBy: userId,
        },
      });
      this.settingsCache.invalidate('config.analysis_threshold');
      this.logger.log(
        `Analysis threshold updated to ${thresholds.analysisThreshold}`,
      );
    }

    if (thresholds.hunterThreshold !== undefined) {
      await this.prisma.systemSetting.upsert({
        where: { key: 'config.hunter_threshold' },
        update: {
          value: thresholds.hunterThreshold.toString(),
          updatedBy: userId,
        },
        create: {
          key: 'config.hunter_threshold',
          value: thresholds.hunterThreshold.toString(),
          description: 'Min businessImpact for AI Hunter to trigger generation',
          updatedBy: userId,
        },
      });
      this.settingsCache.invalidate('config.hunter_threshold');
      this.logger.log(
        `Hunter threshold updated to ${thresholds.hunterThreshold}`,
      );
    }
  }
}
