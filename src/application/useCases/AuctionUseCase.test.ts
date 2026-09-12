import { describe, it, expect } from 'vitest';
import { Player } from '../../domain/entities/Player';
import { Money } from '../../domain/valueObjects/Money';
import {
  startAuction,
  placeBid,
  passBid,
  isAuctionOver,
  getAuctionWinnerId,
  resolveAuction,
} from './AuctionUseCase';

function makePlayer(id: string, money = 1200): Player {
  return Player.create(id, `لاعب-${id}`, '#000000', Money.of(money));
}

describe('AuctionUseCase', () => {
  it('startAuction: الدور يبدأ باللاعب اللي بعد من تخطّى الشراء', () => {
    const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')];
    const auction = startAuction(6, players, 'p1');

    expect(auction.eligiblePlayerIds).toEqual(['p1', 'p2', 'p3']);
    expect(auction.turnPlayerId).toBe('p2');
    expect(auction.currentHighestBid).toBe(0);
    expect(auction.currentHighestBidderId).toBeNull();
  });

  it('placeBid: مزايدة أقل من الحد الأدنى (الزيادة) تُرفض', () => {
    const players = [makePlayer('p1'), makePlayer('p2')];
    const auction = startAuction(6, players, 'p1'); // دور p2 أول
    const result = placeBid(auction, players, 'p2', 5); // أقل من MIN_BID_INCREMENT فوق 0
    expect(result).toEqual({ success: false, reason: 'bid-too-low' });
  });

  it('placeBid: لاعب لا يملك رصيداً كافياً تُرفض مزايدته', () => {
    const players = [makePlayer('p1', 5), makePlayer('p2', 5)];
    const auction = startAuction(6, players, 'p1');
    const result = placeBid(auction, players, 'p2', 20);
    expect(result).toEqual({ success: false, reason: 'insufficient-funds' });
  });

  it('placeBid: ليس دور هذا اللاعب حالياً تُرفض المزايدة', () => {
    const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')];
    const auction = startAuction(6, players, 'p1'); // دور p2
    const result = placeBid(auction, players, 'p3', 20);
    expect(result).toEqual({ success: false, reason: 'not-your-turn' });
  });

  it('مزايدة فائزة تنقل العقار وتخصم المبلغ الصحيح فقط من الفائز', () => {
    const players = [makePlayer('p1', 200), makePlayer('p2', 200)];
    let auction = startAuction(6, players, 'p1'); // دور p2

    const bidResult = placeBid(auction, players, 'p2', 50);
    expect(bidResult.success).toBe(true);
    if (!bidResult.success) return;
    auction = bidResult.auction;
    expect(auction.turnPlayerId).toBe('p1');

    const passResult = passBid(auction, 'p1');
    expect(passResult.success).toBe(true);
    if (!passResult.success) return;
    auction = passResult.auction;

    expect(isAuctionOver(auction)).toBe(true);
    expect(getAuctionWinnerId(auction)).toBe('p2');

    const resolution = resolveAuction(auction, players);
    expect(resolution.sold).toBe(true);
    if (!resolution.sold) return;
    expect(resolution.amount).toBe(50);
    expect(resolution.winner.id).toBe('p2');
    expect(resolution.winner.money.value).toBe(150);
    expect(resolution.winner.ownsTile(6)).toBe(true);
  });

  it('لو مرّ الجميع بدون أي مزايدة، العقار يبقى بدون مالك ولا بيع بصفر', () => {
    const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')];
    let auction = startAuction(6, players, 'p1'); // دور p2

    const pass1 = passBid(auction, 'p2');
    expect(pass1.success).toBe(true);
    if (!pass1.success) return;
    auction = pass1.auction;
    expect(isAuctionOver(auction)).toBe(false);

    const pass2 = passBid(auction, 'p3');
    expect(pass2.success).toBe(true);
    if (!pass2.success) return;
    auction = pass2.auction;

    // اللاعب الوحيد المتبقي هو p1 (صاحب الدور الأصلي)، لكن ما حدا زايد فعلياً
    expect(isAuctionOver(auction)).toBe(true);
    expect(getAuctionWinnerId(auction)).toBeNull();

    const resolution = resolveAuction(auction, players);
    expect(resolution.sold).toBe(false);
  });

  it('لا يمكن للاعب أن يمرّ مرتين بنفس المزاد', () => {
    const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')];
    const auction = startAuction(6, players, 'p1');
    const passResult = passBid(auction, 'p2');
    expect(passResult.success).toBe(true);
    if (!passResult.success) return;

    // يفترض دور p3 الآن، لو حاولنا نمرّر p2 مرة ثانية بالخطأ (دورها انتهى أصلاً)
    const secondAttempt = passBid(passResult.auction, 'p2');
    expect(secondAttempt).toEqual({ success: false, reason: 'not-your-turn' });
  });
});
