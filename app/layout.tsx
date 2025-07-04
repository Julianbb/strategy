import { Toaster } from 'sonner';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';
import { SessionProvider } from 'next-auth/react';
import Script from 'next/script';

export const metadata: Metadata = {
  metadataBase: new URL('https://chat.vercel.ai'),
  title: 'Next.js Chatbot Template',
  description: 'Next.js chatbot template using the AI SDK.',
  applicationName: 'Next.js Chatbot',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Next.js Chatbot',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
});

const LIGHT_THEME_COLOR = 'hsl(0 0% 100%)';
const DARK_THEME_COLOR = 'hsl(240deg 10% 3.92%)';
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // `next-themes` injects an extra classname to the body element to avoid
      // visual flicker before hydration. Hence the `suppressHydrationWarning`
      // prop is necessary to avoid the React hydration mismatch warning.
      // https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
        
        {/* iOS PWA 启动画面 */}
        {/* iPhone X, XS, 11 Pro */}
        <link
          rel="apple-touch-startup-image"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash-1125x2436.png"
        />
        {/* iPhone XR, 11 */}
        <link
          rel="apple-touch-startup-image"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)"
          href="/splash-828x1792.png"
        />
        {/* iPhone 12, 13, 14, 15 */}
        <link
          rel="apple-touch-startup-image"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash-1170x2532.png"
        />
        {/* iPhone 12, 13, 14, 15 Pro Max */}
        <link
          rel="apple-touch-startup-image"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash-1290x2796.png"
        />
        {/* iPhone 12, 13 mini */}
        <link
          rel="apple-touch-startup-image"
          media="(device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash-1080x2340.png"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster position="top-center" />
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
        
        <Script id="pwa-handler" strategy="afterInteractive">
          {`
            (function() {
              // 检测是否在 standalone 模式
              const isStandalone = window.navigator.standalone || 
                                   window.matchMedia('(display-mode: standalone)').matches;

              // 只在 standalone 模式下应用限制
              if (isStandalone) {
                // 禁用下拉刷新
                let touchStartY = 0;
                
                document.addEventListener('touchstart', function(e) {
                  touchStartY = e.touches[0].clientY;
                }, { passive: true });

                document.addEventListener('touchmove', function(e) {
                  const touchY = e.touches[0].clientY;
                  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                  
                  // 只在页面顶部且向下拉时阻止
                  if (scrollTop === 0 && touchY > touchStartY && e.cancelable) {
                    e.preventDefault();
                  }
                }, { passive: false });

                // 禁用双击缩放
                let lastTouchEnd = 0;
                document.addEventListener('touchend', function(e) {
                  const now = Date.now();
                  if (now - lastTouchEnd <= 300) {
                    e.preventDefault();
                  }
                  lastTouchEnd = now;
                }, false);

                // 禁用长按弹出菜单
                document.addEventListener('contextmenu', function(e) {
                  e.preventDefault();
                });

                // 添加 standalone 类名到 body
                document.body.classList.add('standalone-mode');
              }

              // PWA 安装提示
              let deferredPrompt;
              
              window.addEventListener('beforeinstallprompt', function(e) {
                // 阻止默认安装提示
                e.preventDefault();
                // 保存事件以便稍后触发
                deferredPrompt = e;
                
                // 可以在这里显示自定义安装按钮
                // 例如：document.getElementById('install-button').style.display = 'block';
                
                // 或者触发自定义事件
                window.dispatchEvent(new CustomEvent('pwa-install-available', { detail: { prompt: deferredPrompt } }));
              });

              // 监听安装成功
              window.addEventListener('appinstalled', function() {
                console.log('PWA was installed');
                deferredPrompt = null;
              });

              // 监听 iOS 添加到主屏幕提示
              if ('standalone' in window.navigator && !window.navigator.standalone && /iPhone|iPod|iPad/i.test(navigator.userAgent)) {
                // 可以在这里显示 iOS 安装提示
                window.dispatchEvent(new CustomEvent('ios-install-prompt'));
              }

              // 适配主题切换时的状态栏颜色（与现有主题系统集成）
              const updateStatusBarStyle = () => {
                if (!isStandalone) return;
                
                const isDark = document.documentElement.classList.contains('dark');
                const metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
                
                if (metaStatusBar) {
                  metaStatusBar.setAttribute('content', isDark ? 'black-translucent' : 'default');
                }
              };

              // 监听主题变化
              const themeObserver = new MutationObserver(updateStatusBarStyle);
              themeObserver.observe(document.documentElement, { 
                attributes: true, 
                attributeFilter: ['class'] 
              });
              
              updateStatusBarStyle();
            })();
          `}
        </Script>
      </body>
    </html>
  );
}