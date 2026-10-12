import { NOW_YEAR } from '@/lib/snes/money';

// The data credit at the foot of every SNES page (Wes's requirement). `pop` adds the chart and box-office sources
// where Time Machine data appears (the Time Machine, Be Kind, Rewind on game pages, On this day on the hub); `cpi`
// adds the note wherever a figure is shown in today's money.
export default function SnesCredit({ pop = false, cpi = false }: { pop?: boolean; cpi?: boolean }) {
  return (
    <p className="s-credit">
      Data: IGDB · Wikipedia · libretro-thumbnails
      {pop ? ' · Charts: Billboard · Box office: Box Office Mojo via Wikipedia' : null}.
      {cpi ? ` Today’s money uses US CPI-U, ${NOW_YEAR} dollars.` : null}
    </p>
  );
}
