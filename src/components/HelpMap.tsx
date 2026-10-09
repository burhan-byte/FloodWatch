import { CircleMarker, Tooltip } from 'react-leaflet';
import { useLocation } from 'wouter';
import type { PublicCase } from '../../shared/schema';
import { NEED_ICON, STATUS_COLOR, STATUS_LABEL } from '../lib/labels';
import { urgencyRank } from '../lib/urgency';
import { BaseMap } from './map/BaseMap';

export function HelpMap({ cases, className }: { cases: PublicCase[]; className?: string }) {
  const [, navigate] = useLocation();
  return (
    <BaseMap className={className}>
      {cases.map((c) => (
        <CircleMarker
          key={c.id}
          center={[c.lat, c.lng]}
          radius={c.status === 'open' && urgencyRank(c) === 0 ? 11 : 8}
          pathOptions={{ color: '#ffffff', weight: 2, fillColor: STATUS_COLOR[c.status], fillOpacity: 0.95 }}
          eventHandlers={{ click: () => navigate(`/r/${c.id}`) }}
        >
          <Tooltip direction="top" offset={[0, -8]} className="fw-map-label">
            {c.needs.map((n) => NEED_ICON[n]).join(' ')} {STATUS_LABEL[c.status]}
          </Tooltip>
        </CircleMarker>
      ))}
    </BaseMap>
  );
}
