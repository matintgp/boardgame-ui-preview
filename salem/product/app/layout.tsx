import type {Metadata} from 'next';
import '../components/salem-product.css';
export const metadata:Metadata={title:'Salem 1692 | BoardGame',description:'Secure multiplayer Salem game frontend'};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="fa" dir="rtl"><body style={{margin:0,background:'#09141e'}}>{children}</body></html>;
}
