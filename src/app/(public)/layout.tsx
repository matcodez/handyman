import { Footer, PublicNav } from '@/components/layout/public-chrome'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNav />
      <main id="contenido">{children}</main>
      <Footer />
    </>
  )
}
