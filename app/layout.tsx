import "./globals.css";
import ContentProtection from "./content-protection";

export const metadata = {
  title: "Redbridge 实习生考核",
  description: "Redbridge 在线实习生考核平台",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <ContentProtection />
        {children}
      </body>
    </html>
  );
}
