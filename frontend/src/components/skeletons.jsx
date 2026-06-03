// Content-shaped loading skeletons (no spinners).
function Sk({ w = "100%", h = 14, r = 8, style }) {
  return <div className="skel" style={{ width: w, height: h, borderRadius: r, flex: "none", ...style }} />;
}

function CardSk() {
  return (
    <div className="ev-card">
      <div className="skel" style={{ aspectRatio: "16/10", borderRadius: 0 }} />
      <div className="body stack" style={{ "--gap": "10px" }}>
        <Sk w="75%" h={18} />
        <Sk w="50%" h={12} />
        <div className="spread"><Sk w={84} h={26} r={999} /><Sk w={72} h={14} /></div>
      </div>
    </div>
  );
}

export function EventGridSkeleton({ count = 6 }) {
  return (
    <div className="ev-grid">
      {Array.from({ length: count }).map((_, i) => <CardSk key={i} />)}
    </div>
  );
}

export function EventDetailSkeleton() {
  return (
    <div className="container section stack fade-in" style={{ "--gap": "24px" }}>
      <div className="skel" style={{ height: 280, borderRadius: "var(--radius-lg)" }} />
      <div className="grid-cols">
        <div className="stack" style={{ "--gap": "20px" }}>
          <div className="card card-p stack" style={{ "--gap": "12px" }}>
            <Sk w="55%" h={16} /><Sk w="80%" h={12} />
          </div>
          <div className="card card-p stack" style={{ "--gap": "10px" }}>
            <Sk w={120} h={18} /><Sk h={12} /><Sk h={12} /><Sk w="70%" h={12} />
          </div>
        </div>
        <div className="card card-p stack" style={{ "--gap": "12px" }}>
          <Sk w={120} h={18} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="tt-row">
              <div className="grow stack" style={{ "--gap": "8px" }}>
                <Sk w="50%" h={14} /><Sk w="70%" h={10} />
              </div>
              <Sk w={110} h={36} r={999} />
            </div>
          ))}
          <Sk h={50} r={999} />
        </div>
      </div>
    </div>
  );
}

function TktSk() {
  return (
    <div className="tkt" style={{ marginTop: 14 }}>
      <div className="stub"><div className="skel" style={{ width: 92, height: 92, borderRadius: 12 }} /></div>
      <div className="body stack" style={{ "--gap": "9px" }}>
        <div className="spread"><Sk w={110} h={22} r={999} /><Sk w={56} h={22} r={999} /></div>
        <Sk w="75%" h={18} /><Sk w="55%" h={12} />
      </div>
    </div>
  );
}

export function OrderSkeleton() {
  return (
    <div className="container section fade-in" style={{ maxWidth: 640 }}>
      <div className="center stack" style={{ "--gap": "8px", marginBottom: 16, alignItems: "center" }}>
        <Sk w={210} h={28} /><Sk w={160} h={14} />
      </div>
      <TktSk /><TktSk />
    </div>
  );
}

export function TicketListSkeleton({ count = 3 }) {
  return (
    <div className="container section fade-in" style={{ maxWidth: 640 }}>
      <Sk w={180} h={30} style={{ marginBottom: 16 }} />
      {Array.from({ length: count }).map((_, i) => <TktSk key={i} />)}
    </div>
  );
}

export function TicketSkeleton() {
  return (
    <div className="container section fade-in" style={{ maxWidth: 540 }}>
      <div className="skel" style={{ height: 300, borderRadius: "var(--radius-lg)" }} />
      <div className="card card-p stack" style={{ marginTop: 18, "--gap": "12px" }}>
        <Sk w={150} h={18} /><Sk h={12} /><Sk w="60%" h={12} />
      </div>
    </div>
  );
}

export function OrganizerListSkeleton() {
  return (
    <div className="container section stack fade-in" style={{ "--gap": "20px" }}>
      <Sk w={200} h={32} />
      <OrganizerCardsSkeleton />
    </div>
  );
}

export function OrganizerCardsSkeleton({ count = 3 }) {
  return (
    <div className="ev-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card card-p stack" style={{ "--gap": "12px" }}>
          <Sk w={100} h={24} r={999} />
          <Sk w="80%" h={18} /><Sk w="50%" h={12} />
          <div className="row" style={{ gap: 8 }}><Sk w={80} h={24} r={999} /><Sk w={90} h={24} r={999} /></div>
          <Sk h={38} r={999} />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="container section stack fade-in" style={{ "--gap": "20px" }}>
      <Sk w={220} h={32} />
      <div className="stats">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="stat stack" style={{ "--gap": "8px" }}>
            <Sk w={26} h={22} r={6} /><Sk w="65%" h={26} /><Sk w="45%" h={10} />
          </div>
        ))}
      </div>
      <div className="card card-p"><Sk w="100%" h={46} r={12} /></div>
      <div className="grid-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card card-p stack" style={{ "--gap": "12px" }}>
            <Sk w={140} h={18} />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="stack" style={{ "--gap": "6px" }}>
                <div className="spread"><Sk w="40%" h={12} /><Sk w={60} h={12} /></div>
                <Sk h={7} r={999} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResultsSkeleton() {
  return (
    <div className="container section stack fade-in" style={{ "--gap": "22px" }}>
      <Sk w={240} h={32} />
      <div className="card card-p stack" style={{ "--gap": "12px" }}>
        <Sk w={160} h={18} /><Sk h={46} r={10} />
      </div>
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="card-p spread"><Sk w={140} h={18} /><Sk w={130} h={36} r={10} /></div>
        <div className="stack" style={{ padding: "0 14px 16px", "--gap": "14px" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="row" style={{ gap: 14 }}>
              <Sk w={20} h={16} /><Sk w={36} h={12} /><Sk w="40%" h={14} /><Sk w={70} h={14} style={{ marginLeft: "auto" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
