/**
 * Default quest data for Terminal Quest
 */

import {
  Quest,
  QuestObjective,
  QuestObjectiveType,
  QuestStatus
} from '../types/game.js';

interface QuestSeed extends Omit<Quest, 'status' | 'isMainQuest' | 'repeatable'> {
  status?: QuestStatus;
  isMainQuest?: boolean;
  repeatable?: boolean;
}

function createObjective(
  description: string,
  type: QuestObjectiveType,
  targetId: string,
  requiredAmount: number
): QuestObjective {
  return {
    description,
    type,
    targetId,
    requiredAmount,
    currentAmount: 0,
    completed: false
  };
}

function killObjective(
  description: string,
  targetId: string,
  requiredAmount: number
): QuestObjective {
  return createObjective(description, QuestObjectiveType.Kill, targetId, requiredAmount);
}

function collectObjective(
  description: string,
  targetId: string,
  requiredAmount: number
): QuestObjective {
  return createObjective(description, QuestObjectiveType.Collect, targetId, requiredAmount);
}

function exploreObjective(
  description: string,
  locationId: string
): QuestObjective {
  return createObjective(description, QuestObjectiveType.Explore, locationId, 1);
}

function talkObjective(
  description: string,
  targetId: string
): QuestObjective {
  return createObjective(description, QuestObjectiveType.Talk, targetId, 1);
}

function createQuest(seed: QuestSeed): Quest {
  return {
    ...seed,
    status: seed.status ?? QuestStatus.NotStarted,
    isMainQuest: seed.isMainQuest ?? false,
    repeatable: seed.repeatable ?? false
  };
}

/**
 * Build a fresh copy of default quests
 */
export function getDefaultQuests(): Record<string, Quest> {
  const quests: Quest[] = [
    createQuest({
      id: 'slime-cleanup',
      name: '초보 의뢰: 버그 슬라임 정리',
      description: '메모리 숲 주변의 버그 슬라임을 정리해 마을 안전을 확보하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 1,
      prerequisites: [],
      objectives: [
        killObjective('Bug Slime 3마리 처치', 'bug-slime', 3)
      ],
      rewards: {
        exp: 120,
        gold: 90,
        items: ['health-potion']
      }
    }),
    createQuest({
      id: 'forest-survey',
      name: '현장 조사: 메모리 숲 답사',
      description: '메모리 숲에 직접 이동해 현장을 조사하고 보고하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 1,
      prerequisites: [],
      objectives: [
        exploreObjective('메모리 숲 도착', 'memory-forest')
      ],
      rewards: {
        exp: 100,
        gold: 70,
        items: ['save-token']
      }
    }),
    createQuest({
      id: 'ghost-debugging',
      name: '현상금: 404 고스트 처리',
      description: '숲에서 출몰하는 404 Ghost를 처치해 데이터 불안을 잠재우세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 2,
      prerequisites: ['slime-cleanup'],
      objectives: [
        killObjective('404 Ghost 2마리 처치', '404-ghost', 2)
      ],
      rewards: {
        exp: 180,
        gold: 140,
        items: ['mana-potion']
      }
    }),
    createQuest({
      id: 'potion-supply',
      name: '물자 조달: 체력 포션 수집',
      description: '비트 타운 게시판의 요청에 따라 체력 포션 2개를 확보하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 1,
      prerequisites: [],
      objectives: [
        collectObjective('Health Potion 2개 수집', 'health-potion', 2)
      ],
      rewards: {
        exp: 110,
        gold: 80,
        items: ['mana-potion']
      }
    }),
    createQuest({
      id: 'board-checkin',
      name: '행정 절차: 게시판 체크인',
      description: '게시판 담당자와 대화해 모험가 등록을 완료하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 1,
      prerequisites: [],
      objectives: [
        talkObjective('퀘스트 게시판 담당자와 대화', 'quest-board')
      ],
      rewards: {
        exp: 90,
        gold: 60,
        items: ['save-token']
      }
    }),
    createQuest({
      id: 'merchant-network',
      name: '상인 네트워크: 장비상 인사',
      description: '상점 거리를 방문해 상인들과 첫 인사를 나누세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 1,
      prerequisites: ['board-checkin'],
      objectives: [
        talkObjective('상인과 대화', 'merchant')
      ],
      rewards: {
        exp: 100,
        gold: 75,
        items: ['health-potion']
      }
    }),
    createQuest({
      id: 'inn-consult',
      name: '휴식 가이드: 여관 상담',
      description: '여관 주인에게 모험 중 휴식 요령을 듣고 기록하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 1,
      prerequisites: ['board-checkin'],
      objectives: [
        talkObjective('여관 주인과 대화', 'innkeeper')
      ],
      rewards: {
        exp: 100,
        gold: 75,
        items: ['mana-potion']
      }
    }),
    createQuest({
      id: 'memory-crow-cull',
      name: '숲 정화: 메모리 까마귀 구제',
      description: '숲의 데이터 잔해를 노리는 메모리 까마귀와 바이러스 벌을 정리하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 2,
      prerequisites: ['forest-survey'],
      objectives: [
        killObjective('Data Crow 4마리 처치', 'data-crow', 4),
        killObjective('Virus Bee 2마리 처치', 'virus-bee', 2)
      ],
      rewards: {
        exp: 170,
        gold: 130,
        items: ['memory-fragment-small']
      }
    }),
    createQuest({
      id: 'cache-entry-scout',
      name: '진입 작전: 캐시 동굴 정찰',
      description: '캐시 동굴 입구를 정찰하고 탐험 가능 여부를 보고하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 4,
      prerequisites: ['ghost-debugging'],
      objectives: [
        exploreObjective('캐시 동굴 진입', 'cache-cave')
      ],
      rewards: {
        exp: 220,
        gold: 170,
        items: ['mana-potion']
      }
    }),
    createQuest({
      id: 'cache-bat-extermination',
      name: '동굴 소탕: 캐시 박쥐 및 버퍼 웜',
      description: '캐시 동굴의 박쥐 떼와 버퍼 웜을 정리해 이동 경로를 확보하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 5,
      prerequisites: ['cache-entry-scout'],
      objectives: [
        killObjective('Cache Bat 4마리 처치', 'cache-bat', 4),
        killObjective('Buffer Worm 3마리 처치', 'buffer-worm', 3)
      ],
      rewards: {
        exp: 260,
        gold: 210,
        items: ['antidote']
      }
    }),
    createQuest({
      id: 'crystal-sample-collection',
      name: '연구 의뢰: 캐시 파편 샘플 수집',
      description: '연구소 요청에 따라 캐시 파편과 중형 메모리 파편을 확보하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 6,
      prerequisites: ['cache-bat-extermination'],
      objectives: [
        collectObjective('Cache Fragment 1개 수집', 'cache-fragment', 1),
        collectObjective('Medium Memory Fragment 1개 수집', 'memory-fragment-medium', 1)
      ],
      rewards: {
        exp: 300,
        gold: 260,
        items: ['overclock-drink']
      }
    }),
    createQuest({
      id: 'supply-route-seal',
      name: '지원 작전: 보급선 봉인',
      description: '상인 및 여관과 협력해 임시 보급선을 구축하고 필수 물자를 적재하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 7,
      prerequisites: ['merchant-network', 'inn-consult'],
      objectives: [
        talkObjective('상인과 보급 협의', 'merchant'),
        talkObjective('여관 주인과 보급 협의', 'innkeeper'),
        collectObjective('Health Potion 3개 적재', 'health-potion', 3)
      ],
      rewards: {
        exp: 300,
        gold: 250,
        items: ['save-token']
      }
    }),
    createQuest({
      id: 'plains-recon',
      name: '전초 임무: 비트 평원 정찰',
      description: '비트 평원으로 진출해 늑대 무리의 활동 지점을 확보하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 8,
      prerequisites: ['crystal-sample-collection'],
      objectives: [
        exploreObjective('비트 평원 진입', 'bit-plains'),
        killObjective('Bit Wolf 3마리 처치', 'bit-wolf', 3)
      ],
      rewards: {
        exp: 360,
        gold: 320,
        items: ['defense-shell']
      }
    }),
    createQuest({
      id: 'wyvern-hunt',
      name: '정밀 사냥: 알고리즘 와이번 추적',
      description: '평원을 교란하는 알고리즘 와이번을 추적/처치해 하늘길을 안전화하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 10,
      prerequisites: ['plains-recon'],
      objectives: [
        killObjective('Algorithm Wyvern 2마리 처치', 'algorithm-wyvern', 2)
      ],
      rewards: {
        exp: 420,
        gold: 360,
        items: ['mega-health-potion']
      }
    }),
    createQuest({
      id: 'plains-signal-triangulation',
      name: '보조 작전: 평원 신호 삼각측량',
      description: '비트 평원 전초 신호를 복구하고 교란 지점을 삼각측량해 지도 정확도를 높이세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 10,
      prerequisites: ['plains-recon'],
      objectives: [
        exploreObjective('비트 평원 재진입', 'bit-plains'),
        killObjective('Bit Wolf 5마리 처치', 'bit-wolf', 5),
        collectObjective('Health Potion 2개 확보', 'health-potion', 2)
      ],
      rewards: {
        exp: 460,
        gold: 390,
        items: ['mana-potion']
      }
    }),
    createQuest({
      id: 'plains-logistics-sweep',
      name: '보조 작전: 평원 보급선 스윕',
      description: '평원 보급선을 교란하는 개체를 정리하고 상인에게 복구 보고를 전달하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 11,
      prerequisites: ['plains-recon'],
      objectives: [
        killObjective('Algorithm Wyvern 3마리 처치', 'algorithm-wyvern', 3),
        killObjective('Bit Wolf 4마리 처치', 'bit-wolf', 4),
        talkObjective('상인에게 보급선 복구 보고', 'merchant')
      ],
      rewards: {
        exp: 500,
        gold: 420,
        items: ['overclock-drink']
      }
    }),
    createQuest({
      id: 'registry-briefing',
      name: '작전 개시: 레지스트리 던전 브리핑',
      description: '레지스트리 던전 진입 전 작전 브리핑을 수령하고 현장을 확인하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 12,
      prerequisites: ['wyvern-hunt'],
      objectives: [
        exploreObjective('레지스트리 던전 도착', 'registry-dungeon'),
        talkObjective('게시판에서 작전 브리핑 확인', 'quest-board')
      ],
      rewards: {
        exp: 520,
        gold: 360,
        items: ['mega-mana-potion']
      },
      isMainQuest: true
    }),
    createQuest({
      id: 'security-hardening',
      name: '분기 A: 보안 강화 프로토콜',
      description: '권한 계층의 적을 제거해 보안 경로를 선행 확보하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 13,
      prerequisites: ['registry-briefing'],
      objectives: [
        killObjective('Permission Knight 2마리 처치', 'permission-knight', 2),
        killObjective('Access Denied 2마리 처치', 'access-denied', 2)
      ],
      rewards: {
        exp: 560,
        gold: 420,
        items: ['firewall-armor']
      },
      isMainQuest: true
    }),
    createQuest({
      id: 'recovery-protocol',
      name: '분기 B: 복구 프로토콜 구축',
      description: '백업/복구 라인의 위협을 제거해 안정적인 재시작 경로를 확보하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 13,
      prerequisites: ['registry-briefing'],
      objectives: [
        killObjective('Backup Zombie 2마리 처치', 'backup-zombie', 2),
        killObjective('Restore Ghost 2마리 처치', 'restore-ghost', 2)
      ],
      rewards: {
        exp: 560,
        gold: 420,
        items: ['memory-fragment-large']
      },
      isMainQuest: true
    }),
    createQuest({
      id: 'key-phantom-pursuit',
      name: '분기 C: 키 팬텀 추적전',
      description: '던전 핵심 키를 탈취한 팬텀 군을 추적해 접근 권한을 회수하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 14,
      prerequisites: ['registry-briefing'],
      objectives: [
        killObjective('Key Phantom 4마리 처치', 'key-phantom', 4),
        killObjective('Entry Specter 2마리 처치', 'entry-specter', 2)
      ],
      rewards: {
        exp: 600,
        gold: 460,
        items: ['cache-helm']
      },
      isMainQuest: true
    }),
    createQuest({
      id: 'registry-anomaly-catalog',
      name: '보조 작전: 레지스트리 이상군 카탈로그',
      description: '레지스트리 던전의 이상 개체 분포를 수집해 다음 공략 루트를 보강하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 14,
      prerequisites: ['registry-briefing'],
      objectives: [
        exploreObjective('레지스트리 던전 심층 진입', 'registry-dungeon'),
        killObjective('Key Phantom 4마리 처치', 'key-phantom', 4),
        collectObjective('Save Token 1개 확보', 'save-token', 1)
      ],
      rewards: {
        exp: 620,
        gold: 480,
        items: ['defense-shell']
      }
    }),
    createQuest({
      id: 'swap-swamp-expedition',
      name: '분기 A-2: 스왑 늪지 원정',
      description: '보안 경로를 따라 스왑 늪지의 핵심 위협을 제거하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 15,
      prerequisites: ['security-hardening'],
      objectives: [
        exploreObjective('스왑 늪지 진입', 'swap-swamp'),
        killObjective('Garbage Collector 1마리 처치', 'garbage-collector', 1)
      ],
      rewards: {
        exp: 650,
        gold: 500,
        items: ['overclock-drink']
      },
      isMainQuest: true
    }),
    createQuest({
      id: 'thread-forest-sync',
      name: '분기 B-2: 스레드 숲 동기화',
      description: '비동기 개체와 교착 지점을 정리해 통신 흐름을 동기화하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 16,
      prerequisites: ['recovery-protocol'],
      objectives: [
        exploreObjective('스레드 숲 진입', 'thread-forest'),
        killObjective('Async Phantom 3마리 처치', 'async-phantom', 3),
        killObjective('Deadlock Tree 1마리 처치', 'deadlock-tree', 1)
      ],
      rewards: {
        exp: 700,
        gold: 540,
        items: ['defense-shell']
      },
      isMainQuest: true
    }),
    createQuest({
      id: 'thread-rescue-protocol',
      name: '보조 작전: 스레드 구조 프로토콜',
      description: '스레드 숲의 교착 지점에 고립된 지원 신호를 회수하고 구조 라인을 복구하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 17,
      prerequisites: ['thread-forest-sync'],
      objectives: [
        exploreObjective('스레드 숲 구조 라인 진입', 'thread-forest'),
        killObjective('Async Phantom 5마리 처치', 'async-phantom', 5),
        killObjective('Deadlock Tree 2마리 처치', 'deadlock-tree', 2)
      ],
      rewards: {
        exp: 760,
        gold: 610,
        items: ['save-token']
      }
    }),
    createQuest({
      id: 'stack-mountain-watch',
      name: '분기 C-2: 스택 산맥 감시',
      description: '스택 산맥의 과부하 지점을 돌파해 정찰 데이터를 회수하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 17,
      prerequisites: ['key-phantom-pursuit'],
      objectives: [
        exploreObjective('스택 산맥 진입', 'stack-mountains'),
        killObjective('Overflow Yeti 1마리 처치', 'overflow-yeti', 1),
        killObjective('Recursion Dragon 1마리 처치', 'recursion-dragon', 1)
      ],
      rewards: {
        exp: 760,
        gold: 580,
        items: ['save-token']
      },
      isMainQuest: true
    }),
    createQuest({
      id: 'branch-convergence-report',
      name: '분기 합류: 통합 상황 보고',
      description: '세 개의 작전 분기 결과를 정리해 게시판에 통합 보고서를 제출하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 18,
      prerequisites: ['swap-swamp-expedition', 'thread-forest-sync', 'stack-mountain-watch'],
      objectives: [
        talkObjective('게시판에 통합 보고', 'quest-board'),
        collectObjective('Save Token 1개 확보', 'save-token', 1)
      ],
      rewards: {
        exp: 820,
        gold: 620,
        items: ['ultra-health-potion']
      },
      isMainQuest: true
    }),
    createQuest({
      id: 'heap-cave-expedition',
      name: '심화 작전: 힙 동굴 탐사',
      description: '메모리 누수의 근원을 추적하기 위해 힙 동굴로 진입하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 20,
      prerequisites: ['branch-convergence-report'],
      objectives: [
        exploreObjective('힙 동굴 진입', 'heap-cave'),
        killObjective('Fragment Golem 3마리 처치', 'fragment-golem', 3)
      ],
      rewards: {
        exp: 900,
        gold: 700,
        items: ['ultra-mana-potion']
      },
      isMainQuest: true
    }),
    createQuest({
      id: 'pointer-sanitization',
      name: '정화 임무: 포인터 오염 제거',
      description: '댕글링/와일드 포인터 개체를 제거하고 오염된 힙 영역을 정화하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 21,
      prerequisites: ['heap-cave-expedition'],
      objectives: [
        killObjective('Dangling Pointer 2마리 처치', 'dangling-pointer', 2),
        killObjective('Wild Pointer 2마리 처치', 'wild-pointer', 2),
        killObjective('Heap Corruption Beast 1마리 처치', 'heap-corruption-beast', 1)
      ],
      rewards: {
        exp: 980,
        gold: 760,
        items: ['quantum-tonic']
      },
      isMainQuest: true
    }),
    createQuest({
      id: 'heap-fragment-quarantine',
      name: '보조 작전: 힙 파편 격리',
      description: '오염된 힙 파편을 분리 수거해 대규모 메모리 붕괴를 예방하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 22,
      prerequisites: ['pointer-sanitization'],
      objectives: [
        killObjective('Dangling Pointer 4마리 처치', 'dangling-pointer', 4),
        killObjective('Wild Pointer 4마리 처치', 'wild-pointer', 4),
        collectObjective('Large Memory Fragment 2개 확보', 'memory-fragment-large', 2)
      ],
      rewards: {
        exp: 1020,
        gold: 780,
        items: ['quantum-tonic']
      }
    }),
    createQuest({
      id: 'network-layer-mapping',
      name: '네트워크 작전: 계층 매핑',
      description: '네트워크 계층의 구조를 매핑하고 데이터 패킷 흐름을 재정렬하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 22,
      prerequisites: ['pointer-sanitization'],
      objectives: [
        exploreObjective('네트워크 계층 진입', 'network-layer'),
        killObjective('Packet Drone 4마리 처치', 'packet-drone', 4)
      ],
      rewards: {
        exp: 1060,
        gold: 780,
        items: ['ultra-health-potion']
      },
      isMainQuest: true
    }),
    createQuest({
      id: 'firewall-stress-test',
      name: '분기 D: 방화벽 스트레스 테스트',
      description: '방화벽 라인에 집중 공격을 수행해 방어 한계를 검증하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 23,
      prerequisites: ['network-layer-mapping'],
      objectives: [
        killObjective('Firewall Golem 3마리 처치', 'firewall-golem', 3),
        killObjective('SSL Serpent 2마리 처치', 'ssl-serpent', 2),
        killObjective('Network Overlord 1마리 처치', 'network-overlord', 1)
      ],
      rewards: {
        exp: 1140,
        gold: 840,
        items: ['checksum-aegis']
      },
      isMainQuest: true
    }),
    createQuest({
      id: 'protocol-audit',
      name: '분기 E: 프로토콜 감사',
      description: '프로토콜 라인의 은폐 노드를 제거해 통신 무결성을 회복하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 23,
      prerequisites: ['network-layer-mapping'],
      objectives: [
        killObjective('Proxy Phantom 3마리 처치', 'proxy-phantom', 3),
        killObjective('Router Spider 3마리 처치', 'router-spider', 3),
        killObjective('DNS Specter 2마리 처치', 'dns-specter', 2)
      ],
      rewards: {
        exp: 1140,
        gold: 840,
        items: ['kernel-guard-boots']
      },
      isMainQuest: true
    }),
    createQuest({
      id: 'network-fallback-lab',
      name: '보조 작전: 네트워크 우회 실험',
      description: '우회 라우팅 실험을 수행해 전면전 실패 시의 백업 통신 경로를 확보하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 24,
      prerequisites: ['network-layer-mapping'],
      objectives: [
        exploreObjective('네트워크 계층 우회 구간 진입', 'network-layer'),
        killObjective('Packet Drone 5마리 처치', 'packet-drone', 5),
        killObjective('Proxy Phantom 3마리 처치', 'proxy-phantom', 3)
      ],
      rewards: {
        exp: 1160,
        gold: 880,
        items: ['checksum-aegis']
      }
    }),
    createQuest({
      id: 'kernel-fortress-scout',
      name: '분기 합류: 커널 요새 정찰',
      description: '방화벽/프로토콜 분기 결과를 통합해 커널 요새 진입로를 확보하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 24,
      prerequisites: ['firewall-stress-test', 'protocol-audit'],
      objectives: [
        exploreObjective('커널 요새 진입', 'kernel-fortress'),
        killObjective('Kernel Guard 2마리 처치', 'kernel-guard', 2),
        killObjective('Scheduler Golem 2마리 처치', 'scheduler-golem', 2)
      ],
      rewards: {
        exp: 1240,
        gold: 900,
        items: ['quantum-edge']
      },
      isMainQuest: true
    }),
    createQuest({
      id: 'kernel-audit-drill',
      name: '보조 작전: 커널 감사 드릴',
      description: '커널 요새의 비상 복구 절차를 사전 점검해 최종 침투 리스크를 낮추세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 27,
      prerequisites: ['kernel-fortress-scout'],
      objectives: [
        exploreObjective('커널 요새 감사 구역 진입', 'kernel-fortress'),
        killObjective('Kernel Guard 3마리 처치', 'kernel-guard', 3),
        collectObjective('Stability Draught 2개 확보', 'stability-draught', 2)
      ],
      rewards: {
        exp: 1320,
        gold: 930,
        items: ['entropy-ring']
      }
    }),
    createQuest({
      id: 'root-directory-breach',
      name: '최종권한 작전: 루트 디렉토리 침투',
      description: '루트 디렉토리로 진입해 코어 권한 구역의 방어를 무력화하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 27,
      prerequisites: ['kernel-fortress-scout'],
      objectives: [
        exploreObjective('루트 디렉토리 진입', 'root-directory'),
        killObjective('Root Access Guardian 1마리 처치', 'root-access-guardian', 1)
      ],
      rewards: {
        exp: 1360,
        gold: 860,
        items: ['entropy-ring']
      },
      isMainQuest: true
    }),
    createQuest({
      id: 'privilege-purge',
      name: '분기 F: 권한 계층 정화',
      description: '권한 계층의 잔여 지배 개체를 제거해 관리자 권한을 회수하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 28,
      prerequisites: ['root-directory-breach'],
      objectives: [
        killObjective('Permission Lord 2마리 처치', 'permission-lord', 2),
        killObjective('Sudo Knight 2마리 처치', 'sudo-knight', 2),
        killObjective('Root Guardian 1마리 처치', 'root-guardian', 1)
      ],
      rewards: {
        exp: 1460,
        gold: 900,
        items: ['root-crown']
      },
      isMainQuest: true
    }),
    createQuest({
      id: 'boot-sequence-stabilization',
      name: '분기 G: 부트 시퀀스 안정화',
      description: '부팅 체인을 교란하는 핵심 개체를 제거하고 재시작 루프를 안정화하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 28,
      prerequisites: ['root-directory-breach'],
      objectives: [
        killObjective('Boot Golem 2마리 처치', 'boot-golem', 2),
        killObjective('Firmware Dragon 1마리 처치', 'firmware-dragon', 1),
        killObjective('Master Boot 1마리 처치', 'master-boot', 1)
      ],
      rewards: {
        exp: 1460,
        gold: 900,
        items: ['nullspace-reaver']
      },
      isMainQuest: true
    }),
    createQuest({
      id: 'corruption-space-entry',
      name: '분기 합류: 오염 공간 진입',
      description: '권한/부트 분기에서 확보한 경로를 사용해 오염 공간을 개방하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 29,
      prerequisites: ['privilege-purge', 'boot-sequence-stabilization'],
      objectives: [
        exploreObjective('오염 공간 진입', 'corruption-space'),
        killObjective('Corruption Spawn 4마리 처치', 'corruption-spawn', 4),
        killObjective('Crash Demon 1마리 처치', 'crash-demon', 1)
      ],
      rewards: {
        exp: 1600,
        gold: 980,
        items: ['singularity-bow']
      },
      isMainQuest: true
    }),
    createQuest({
      id: 'final-purge',
      name: '종결 임무: 코어 정화',
      description: '오염 코어를 제거하고 시스템 붕괴를 유발하는 예외 체인을 완전히 정리하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 30,
      prerequisites: ['corruption-space-entry'],
      objectives: [
        killObjective('Corruption Core 1마리 처치', 'corruption-core', 1),
        killObjective('Fatal Exception 2마리 처치', 'fatal-exception', 2),
        collectObjective('Quantum Tonic 1개 확보', 'quantum-tonic', 1),
        collectObjective('Stability Draught 1개 확보', 'stability-draught', 1)
      ],
      rewards: {
        exp: 1900,
        gold: 1050,
        items: ['save-token', 'save-token']
      },
      isMainQuest: true
    }),
    createQuest({
      id: 'postcore-stability-route',
      name: '엔드게임 보조: 포스트코어 안정화 경로',
      description: '코어 정화 이후 잔류 오염 루트를 추적해 안정화 체인을 완성하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 30,
      prerequisites: ['final-purge'],
      objectives: [
        killObjective('Crash Demon 3마리 처치', 'crash-demon', 3),
        killObjective('Corruption Spawn 6마리 처치', 'corruption-spawn', 6),
        collectObjective('Quantum Tonic 2개 확보', 'quantum-tonic', 2)
      ],
      rewards: {
        exp: 1480,
        gold: 980,
        items: ['save-token']
      }
    }),
    createQuest({
      id: 'spring-memory-festival-sweep',
      name: '시즌 의뢰: 봄 메모리 정화',
      description: '봄 메모리 페스티벌 기간 동안 오염 개체를 정리하고 안정화 물자를 회수하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 30,
      prerequisites: ['final-purge'],
      objectives: [
        killObjective('Corruption Spawn 5마리 처치', 'corruption-spawn', 5),
        collectObjective('Save Token 1개 확보', 'save-token', 1)
      ],
      rewards: {
        exp: 980,
        gold: 760,
        items: ['stability-draught']
      },
      repeatable: true,
      seasonalEventId: 'spring-memory-festival'
    }),
    createQuest({
      id: 'summer-overclock-rush-suppression',
      name: '시즌 의뢰: 여름 오버클럭 진압',
      description: '여름 오버클럭 러시 동안 폭주 개체를 진압하고 과열 로그를 회수하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 30,
      prerequisites: ['final-purge'],
      objectives: [
        killObjective('Crash Demon 2마리 처치', 'crash-demon', 2),
        killObjective('Fatal Exception 2마리 처치', 'fatal-exception', 2)
      ],
      rewards: {
        exp: 1120,
        gold: 840,
        items: ['quantum-tonic']
      },
      repeatable: true,
      seasonalEventId: 'summer-overclock-rush'
    }),
    createQuest({
      id: 'autumn-harvest-hunt-pipeline',
      name: '시즌 의뢰: 가을 수확 파이프라인',
      description: '가을 수확 헌트 기간에 드랍 파이프라인을 안정화하고 회수 자원을 납품하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 30,
      prerequisites: ['final-purge'],
      objectives: [
        killObjective('Corruption Spawn 4마리 처치', 'corruption-spawn', 4),
        collectObjective('Quantum Tonic 1개 확보', 'quantum-tonic', 1)
      ],
      rewards: {
        exp: 1060,
        gold: 910,
        items: ['ultra-health-potion']
      },
      repeatable: true,
      seasonalEventId: 'autumn-harvest-hunt'
    }),
    createQuest({
      id: 'winter-hardening-drive-frontline',
      name: '시즌 의뢰: 겨울 하드닝 전선',
      description: '겨울 하드닝 드라이브 동안 방어 전선을 유지하고 핵심 안정화 물약을 확보하세요.',
      questGiver: '비트 타운 게시판',
      requiredLevel: 30,
      prerequisites: ['final-purge'],
      objectives: [
        killObjective('Crash Demon 1마리 처치', 'crash-demon', 1),
        killObjective('Corruption Core 1마리 처치', 'corruption-core', 1),
        collectObjective('Stability Draught 1개 확보', 'stability-draught', 1)
      ],
      rewards: {
        exp: 1240,
        gold: 900,
        items: ['save-token']
      },
      repeatable: true,
      seasonalEventId: 'winter-hardening-drive'
    })
  ];

  return quests.reduce<Record<string, Quest>>((acc, quest) => {
    acc[quest.id] = quest;
    return acc;
  }, {});
}
