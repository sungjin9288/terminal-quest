import './helpers/moduleMocks';
import { SaveType } from '../src/types/save';
import { showLoadSuccess, showSaveSlots } from '../src/ui/save';

describe('Save UI', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render achievement progress in save slot list', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    showSaveSlots([
      {
        slotNumber: 1,
        exists: true,
        savedAt: 1730390400000,
        locationName: '비트 타운',
        playerName: 'Archivist',
      playerLevel: 4,
      playTime: 600,
      saveType: SaveType.Manual,
      achievementCount: 2,
      achievementTotal: 6,
      resumeTitle: '기록 복구',
      resumeHint: '게시판으로 돌아가 보상을 수령하세요.',
      achievementTrackingMode: 'pinned',
      achievementTrackingHistory: '상점 구매 후 추적 완료: 현장 조달 250/250',
      trackedAchievementTitle: '전선 개척',
      trackedAchievementProgress: '3/4',
      trackedAchievementHint: '서로 다른 지역 4곳을 해금합니다.',
      nextAchievementTitle: '전선 개척',
      nextAchievementProgress: '3/4',
      nextAchievementHint: '서로 다른 지역 4곳을 해금합니다.'
    }
    ]);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('업적: 2/6'));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('재개 힌트: 기록 복구 - 게시판으로 돌아가 보상을 수령하세요.')
    );
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('추적 모드: 핀 고정'));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('추적 업적: 전선 개척 (3/4) - 서로 다른 지역 4곳을 해금합니다.')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('다음 업적: 전선 개척 (3/4) - 서로 다른 지역 4곳을 해금합니다.')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('추적 기록: 상점 구매 후 추적 완료: 현장 조달 250/250')
    );
  });

  it('should render achievement progress in load success message', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    showLoadSuccess({
      slotNumber: 1,
      exists: true,
      savedAt: 1730390400000,
      locationName: '비트 타운',
      playerName: 'Archivist',
      playerLevel: 4,
      playTime: 600,
      achievementCount: 2,
      achievementTotal: 6,
      resumeTitle: '기록 복구',
      resumeHint: '게시판으로 돌아가 보상을 수령하세요.',
      achievementTrackingMode: 'pinned',
      achievementTrackingHistory: '상점 구매 후 추적 완료: 현장 조달 250/250',
      trackedAchievementTitle: '전선 개척',
      trackedAchievementProgress: '3/4',
      trackedAchievementHint: '서로 다른 지역 4곳을 해금합니다.',
      nextAchievementTitle: '전선 개척',
      nextAchievementProgress: '3/4',
      nextAchievementHint: '서로 다른 지역 4곳을 해금합니다.'
    });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('업적: 2/6'));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('재개 힌트: 기록 복구 - 게시판으로 돌아가 보상을 수령하세요.')
    );
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('추적 모드: 핀 고정'));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('추적 업적: 전선 개척 (3/4) - 서로 다른 지역 4곳을 해금합니다.')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('다음 업적: 전선 개척 (3/4) - 서로 다른 지역 4곳을 해금합니다.')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('추적 기록: 상점 구매 후 추적 완료: 현장 조달 250/250')
    );
  });
});
