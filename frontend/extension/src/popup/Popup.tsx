import { useEffect, useState } from "react";

const DASHBOARD_URL = "http://localhost:3000";

const SUPPORTED_URL_PATTERNS = [
  /trendyol\.com/,
  /hepsiburada\.com/,
  /n11\.com/,
  /amazon\.com\.tr/,
  /localhost:3001\/product\//,
];

interface AuthState {
  userId: string | null;
  token: string | null;
}

function isSupportedSite(url: string): boolean {
  return SUPPORTED_URL_PATTERNS.some((pattern) => pattern.test(url));
}

function shortUrl(url: string): string {
  if (!url) return "Aktif sekme okunamadı";
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return "Desteklenmeyen sayfa";
  }
}

export function Popup() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [activeTabUrl, setActiveTabUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      chrome.storage.local.get(["supabase_user_id", "supabase_token"]),
      chrome.tabs.query({ active: true, currentWindow: true }),
    ]).then(([storage, tabs]) => {
      setAuth({
        userId: (storage["supabase_user_id"] as string | null) ?? null,
        token: (storage["supabase_token"] as string | null) ?? null,
      });
      setActiveTabUrl(tabs[0]?.url ?? "");
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ ...s.container, alignItems: "center", justifyContent: "center", minHeight: 150 }}>
        <div style={s.spinner} />
        <div style={s.loadingText}>SepetIQ hazırlanıyor...</div>
      </div>
    );
  }

  const isLoggedIn = !!(auth?.userId || auth?.token);
  const onSupportedSite = isSupportedSite(activeTabUrl);

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div>
          <div style={s.logo}>SepetIQ</div>
          <div style={s.tagline}>Bilinçli satın alma kontrolü</div>
        </div>
        <span style={isLoggedIn ? s.authBadgeOk : s.authBadgeWarn}>
          {isLoggedIn ? "Bağlı" : "Giriş yok"}
        </span>
      </header>

      <div style={s.body}>
        <StatusCard
          type={onSupportedSite ? "success" : "warning"}
          title={onSupportedSite ? "Bu ürün sayfası destekleniyor" : "Desteklenen bir ürün sayfası açın"}
          description={
            onSupportedSite
              ? `${shortUrl(activeTabUrl)} üzerinde analiz başlatabilirsiniz.`
              : "Trendyol, Hepsiburada, n11, Amazon Türkiye veya local demo ürün sayfasına gidin."
          }
        />

        {isLoggedIn ? (
          <LoggedInView onSupportedSite={onSupportedSite} />
        ) : (
          <LoggedOutView />
        )}
      </div>
    </div>
  );
}

function StatusCard({
  type,
  title,
  description,
}: {
  type: "success" | "warning";
  title: string;
  description: string;
}) {
  const style = type === "success" ? s.statusSuccess : s.statusWarning;

  return (
    <div style={{ ...s.statusCard, ...style }}>
      <div style={type === "success" ? s.statusDotSuccess : s.statusDotWarning} />
      <div>
        <div style={s.statusTitle}>{title}</div>
        <div style={s.statusDescription}>{description}</div>
      </div>
    </div>
  );
}

function LoggedOutView() {
  return (
    <div style={s.section}>
      <div style={s.callout}>
        <strong>Dashboard senkronizasyonu için giriş yapın.</strong>
        <span>Giriş sonrası karar geçmişiniz ve skorlarınız web panelinde görünür.</span>
      </div>
      <a href={`${DASHBOARD_URL}/login`} target="_blank" rel="noreferrer" style={s.primaryButton}>
        Google ile Giriş Yap
      </a>
    </div>
  );
}

function LoggedInView({ onSupportedSite }: { onSupportedSite: boolean }) {
  return (
    <div style={s.section}>
      <p style={s.description}>
        {onSupportedSite
          ? 'Sayfadaki "SepetIQ ile Kontrol Et" butonuyla analizi başlatın.'
          : "Analiz butonu yalnızca desteklenen ürün sayfalarında görünür."}
      </p>
      <div style={s.actions}>
        <a href={`${DASHBOARD_URL}/dashboard`} target="_blank" rel="noreferrer" style={s.primaryButton}>
          Dashboard'u Aç
        </a>
        <a href={`${DASHBOARD_URL}/dashboard/history`} target="_blank" rel="noreferrer" style={s.secondaryButton}>
          Karar Geçmişi
        </a>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    width: 340,
    background: "#ffffff",
    color: "#111827",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "16px",
    borderBottom: "1px solid #f3f4f6",
  },
  logo: {
    fontSize: 17,
    fontWeight: 900,
    color: "#4f46e5",
  },
  tagline: {
    marginTop: 2,
    fontSize: 11,
    color: "#6b7280",
    fontWeight: 650,
  },
  authBadgeOk: {
    borderRadius: 999,
    padding: "5px 9px",
    background: "#ecfdf5",
    color: "#047857",
    fontSize: 11,
    fontWeight: 800,
  },
  authBadgeWarn: {
    borderRadius: 999,
    padding: "5px 9px",
    background: "#fff7ed",
    color: "#c2410c",
    fontSize: 11,
    fontWeight: 800,
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 16,
  },
  statusCard: {
    display: "flex",
    gap: 10,
    borderRadius: 10,
    border: "1px solid",
    padding: 12,
  },
  statusSuccess: {
    background: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  statusWarning: {
    background: "#fffbeb",
    borderColor: "#fde68a",
  },
  statusDotSuccess: {
    width: 9,
    height: 9,
    marginTop: 4,
    borderRadius: "50%",
    background: "#22c55e",
    flexShrink: 0,
  },
  statusDotWarning: {
    width: 9,
    height: 9,
    marginTop: 4,
    borderRadius: "50%",
    background: "#f59e0b",
    flexShrink: 0,
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: 850,
    color: "#1f2937",
  },
  statusDescription: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 1.45,
    color: "#6b7280",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  callout: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: 12,
    borderRadius: 10,
    background: "#f9fafb",
    color: "#4b5563",
    fontSize: 12,
    lineHeight: 1.45,
  },
  description: {
    margin: 0,
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 1.5,
  },
  actions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  primaryButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "0 14px",
    borderRadius: 8,
    background: "#4f46e5",
    color: "white",
    fontSize: 13,
    fontWeight: 850,
    textDecoration: "none",
    cursor: "pointer",
  },
  secondaryButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "0 14px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#374151",
    fontSize: 13,
    fontWeight: 800,
    textDecoration: "none",
    cursor: "pointer",
  },
  spinner: {
    width: 22,
    height: 22,
    border: "3px solid #e0e7ff",
    borderTopColor: "#4f46e5",
    borderRadius: "50%",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: 700,
    color: "#6b7280",
  },
};
