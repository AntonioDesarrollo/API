import { customGradient, getIssuer, NETWORK_LABELS, readableOn } from '@/lib/cards';
import { cardUtilization } from '@/lib/finance';
import type { CreditCard, Member } from '@/lib/types';
import { money } from '@/lib/format';

export function CardVisual({ card, holder, size = 'full', onClick }: { card: CreditCard; holder?: Member; size?: 'full' | 'compact' | 'mini'; onClick?: () => void }) {
  const issuer = getIssuer(card.issuer);
  const bg = card.issuer === 'otro' && card.customColor ? customGradient(card.customColor) : issuer.bg;
  const fg = card.issuer === 'otro' && card.customColor ? readableOn(card.customColor) : issuer.fg;
  const util = cardUtilization(card);
  const utilColor = util > 0.7 ? '#ff453a' : util > 0.3 ? '#ffd60a' : issuer.accent;
  const caps = issuer.logo === issuer.logo.toUpperCase() && issuer.logo.length > 4;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`cc ${size}`} style={{ background: bg, color: fg }} onClick={onClick} aria-label={`${card.nickname || issuer.name}`}>
      <div className="cc-top">
        <div>
          <div className={`cc-logo ${caps ? 'caps' : ''}`}>{issuer.logo}</div>
          {size !== 'mini' && card.nickname && <div className="cc-nick">{card.nickname}</div>}
        </div>
        {size !== 'mini' && <div className="cc-chip" />}
      </div>
      {size !== 'mini' && <div className="cc-number">•••• •••• •••• {card.last4 || '0000'}</div>}
      <div className="cc-bottom">
        <div style={{ minWidth: 0 }}>
          {size !== 'mini' && <div className="cc-holder ellipsis">{holder?.name ?? 'Titular'}</div>}
          {size === 'full' && (
            <div className="cc-meta">
              {money(card.used)} de {money(card.limit)}
            </div>
          )}
        </div>
        {card.network === 'mastercard' ? (
          <span className="cc-mc" aria-label="Mastercard">
            <span />
            <span />
          </span>
        ) : (
          <span className="cc-network">{NETWORK_LABELS[card.network]}</span>
        )}
      </div>
      {size !== 'mini' && (
        <div className="cc-usage">
          <span style={{ width: `${Math.min(100, util * 100)}%`, background: utilColor }} />
        </div>
      )}
    </Tag>
  );
}
