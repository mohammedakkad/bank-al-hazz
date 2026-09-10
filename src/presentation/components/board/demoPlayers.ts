import { Player } from '../../../domain/entities/Player';
import { Money } from '../../../domain/valueObjects/Money';

const STARTING_MONEY = Money.of(1200);

export const DEMO_PLAYERS: readonly Player[] = [
  Player.create('p1', 'أحمد', '#E24B4A', STARTING_MONEY).moveTo(6),
  Player.create('p2', 'سارة', '#3BA776', STARTING_MONEY).moveTo(19),
  Player.create('p3', 'خالد', '#1B4F9C', STARTING_MONEY).moveTo(6),
];
