import { SiteHeader } from '@/components/site-header';

export default function SiteLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
