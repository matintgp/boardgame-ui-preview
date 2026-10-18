import {SalemProductRoom} from '../../../components/SalemProductRoom';
export default async function MatchPage({params}:{params:Promise<{matchId:string}>}){
 const {matchId}=await params;
 const socketUrl=process.env.NEXT_PUBLIC_SALEM_WS_URL||'';
 const base=process.env.NEXT_PUBLIC_SALEM_API_BASE||'/api';
 if(!socketUrl)return <main dir="rtl" className="sp-root sp-loading"><h1>اتصال بک‌اند Salem تنظیم نشده</h1><p>برای فعال‌شدن بازی آنلاین، آدرس WebSocket و API سرور باید در تنظیمات محیط قرار بگیرد.</p><p>هیچ نقش یا رأیی در مرورگر شبیه‌سازی یا به‌عنوان اطلاعات معتبر ارسال نمی‌شود.</p></main>;
 return <SalemProductRoom matchId={matchId} socketUrl={socketUrl} apiBase={base} />;
}
