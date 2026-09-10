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
    return new Player({ ...this.props, isInJail: true, position: 10 });
  }

  releaseFromJail(): Player {
    return new Player({ ...this.props, isInJail: false });
  }

  ownsTile(tileId: number): boolean {
    return this.props.ownedTileIds.includes(tileId);
  }
}
