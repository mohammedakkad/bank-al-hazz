import { Money } from '../valueObjects/Money';

export interface PlayerProps {
  readonly id: string;
  readonly nickname: string;
  readonly tokenColor: string;
  readonly money: Money;
  readonly position: number;
  readonly ownedTileIds: readonly number[];
  readonly isInJail: boolean;
  readonly isBankrupt: boolean;
  readonly buildLevels: Readonly<Record<number, number>>;
  /** عدد الأدوار المتتالية اللي قضاها اللاعب بالسجن بدون ما يطلع منه (يُصفَّر عند الدخول والخروج) */
  readonly jailTurnsElapsed: number;
}

/**
 * Player — Entity
 * كل تغيير على حالة اللاعب يمر من هنا (immutable update pattern)
 * بدل تعديل الكائن مباشرة، كل دالة ترجع نسخة جديدة → يسهّل التتبع والاختبار
 */
export class Player {
  private constructor(private readonly props: PlayerProps) {}

  static create(id: string, nickname: string, tokenColor: string, startingMoney: Money): Player {
    return new Player({
      id,
      nickname,
      tokenColor,
      money: startingMoney,
      position: 0,
      ownedTileIds: [],
      isInJail: false,
      isBankrupt: false,
      buildLevels: {},
      jailTurnsElapsed: 0,
    });
  }

  get id() { return this.props.id; }
  get nickname() { return this.props.nickname; }
  get tokenColor() { return this.props.tokenColor; }
  get money() { return this.props.money; }
  get position() { return this.props.position; }
  get ownedTileIds() { return this.props.ownedTileIds; }
  get isInJail() { return this.props.isInJail; }
  get isBankrupt() { return this.props.isBankrupt; }
  get buildLevels() { return this.props.buildLevels; }
  get jailTurnsElapsed() { return this.props.jailTurnsElapsed; }

  moveTo(newPosition: number): Player {
    return new Player({ ...this.props, position: newPosition });
  }

  receive(amount: Money): Player {
    return new Player({ ...this.props, money: this.props.money.add(amount) });
  }

  /**
   * يخصم مبلغاً؛ إذا أصبح الرصيد سالباً، اللاعب يُفلس تلقائياً.
   * قرار الإفلاس هنا مقصود داخل الـentity لأنه قاعدة عمل أساسية غير قابلة للنقض من الخارج.
   */
  pay(amount: Money): Player {
    const newMoney = this.props.money.subtract(amount);
    return new Player({
      ...this.props,
      money: newMoney,
      isBankrupt: newMoney.isNegative(),
    });
  }

  acquireProperty(tileId: number): Player {
    return new Player({ ...this.props, ownedTileIds: [...this.props.ownedTileIds, tileId] });
  }

  sendToJail(): Player {
    return new Player({ ...this.props, isInJail: true, position: 10, jailTurnsElapsed: 0 });
  }

  releaseFromJail(): Player {
    return new Player({ ...this.props, isInJail: false, jailTurnsElapsed: 0 });
  }

  /** يُستدعى لما اللاعب يفشل يطلع من السجن بدور معيّن (ما رمى doubles ولسا ما وصل للدور الإجباري) */
  recordJailAttempt(): Player {
    return new Player({ ...this.props, jailTurnsElapsed: this.props.jailTurnsElapsed + 1 });
  }

  ownsTile(tileId: number): boolean {
    return this.props.ownedTileIds.includes(tileId);
  }

  /**
   * إضافة جديدة (Phase 3): ترفع مستوى البناء على عقار مملوك بمقدار درجة واحدة (حد أقصى 5).
   * الدالة لا تتحقق من الملكية أو المال — هذا مسؤولية use case الاستدعاء (نفس نمط acquireProperty
   * اللي لا يتحقق من كون العقار غير مملوك أصلاً، والتحقق يصير بطبقة application).
   */
  upgradeProperty(tileId: number): Player {
    const currentLevel = this.props.buildLevels[tileId] ?? 0;
    const nextLevel = Math.min(currentLevel + 1, 5);
    return new Player({
      ...this.props,
      buildLevels: { ...this.props.buildLevels, [tileId]: nextLevel },
    });
  }
}
