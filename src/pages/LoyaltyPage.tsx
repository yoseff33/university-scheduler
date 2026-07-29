// src/pages/LoyaltyPage.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../features/auth/useAuth';
import { PageLoader } from '../components/PageLoader';
import { Alert } from '../components/Alert';
import { ArrowRight, Award, History, Coffee, Gift } from 'lucide-react';
import { getActiveCupsCount, getCupsAndRewards, redeemReward, LoyaltyCup, LoyaltyReward } from '../services/loyaltyService';

export function LoyaltyPage() {
  const { session } = useAuth();
  const [activeCups, setActiveCups] = useState<number>(0);
  const [cups, setCups] = useState<LoyaltyCup[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  const targetCups = 6;

  const fetchData = async () => {
    if (!session) return;
    try {
      setLoading(true);
      const [count, { cups: cupsData, rewards: rewardsData }] = await Promise.all([
        getActiveCupsCount(session.user.id),
        getCupsAndRewards(session.user.id),
      ]);
      setActiveCups(count);
      setCups(cupsData);
      setRewards(rewardsData);
    } catch (err) {
      console.error(err);
      setError('تعذر تحميل بيانات الولاء');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session]);

  const handleRedeem = async () => {
    if (!session || activeCups < targetCups) return;
    setRedeeming(true);
    setError(null);
    setSuccess(null);
    try {
      await redeemReward(session.user.id);
      setSuccess('تم استبدال المكافأة بنجاح! 🎉');
      await fetchData(); // تحديث البيانات
    } catch (err: any) {
      setError(err.message || 'فشل استبدال المكافأة');
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) return <PageLoader label="جاري تحميل الولاء..." />;
  if (error) return <div className="p-4 text-center text-red-600">{error}</div>;

  const progress = Math.min((activeCups / targetCups) * 100, 100);
  const canRedeem = activeCups >= targetCups;

  return (
    <main className="min-h-screen bg-vibes-pattern px-4 py-6 pb-20">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center gap-4 py-4">
          <Link to="/home" className="rounded-full bg-white p-2 shadow">
            <ArrowRight className="size-5 text-vibes-800" />
          </Link>
          <h1 className="flex-1 text-2xl font-black text-vibes-900">بطاقة الولاء</h1>
        </header>

        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <div className="space-y-6">
          {/* البطاقة */}
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-vibes-800 to-vibes-600 p-6 text-white shadow-lg">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-vibes-200">فايبز | Vibes</p>
                <p className="mt-1 text-lg font-black">{session?.user?.email || 'ضيف'}</p>
                <p className="text-sm text-vibes-300">رقم العضوية: {session?.user?.id.slice(0, 8)}</p>
              </div>
              <Award className="size-12 text-vibes-300" />
            </div>

            {/* عداد الأكواب */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coffee className="size-5 text-vibes-200" />
                  <span className="font-bold">الأكواب المجمعة</span>
                </div>
                <span className="text-2xl font-black">{activeCups} / {targetCups}</span>
              </div>
              <div className="mt-2 h-4 w-full overflow-hidden rounded-full bg-vibes-700">
                <div className="h-full rounded-full bg-vibes-200 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              {canRedeem && (
                <p className="mt-2 text-sm font-bold text-vibes-200 animate-pulse">
                  🎉 مبروك! أنت جاهز لاستبدال مشروب مجاني!
                </p>
              )}
            </div>

            <button
              onClick={handleRedeem}
              disabled={!canRedeem || redeeming}
              className={`mt-4 w-full rounded-xl py-3 font-bold transition ${
                canRedeem
                  ? 'bg-white text-vibes-800 hover:bg-vibes-100'
                  : 'bg-vibes-700 text-vibes-300 cursor-not-allowed'
              }`}
            >
              {redeeming ? 'جاري الاستبدال...' : canRedeem ? 'استبدال المكافأة 🎁' : 'أنت بحاجة لـ 6 أكواب'}
            </button>
          </div>

          {/* سجل الحركات */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-bold text-vibes-900">
              <History className="size-5" />
              سجل الأكواب والمكافآت
            </h2>
            {cups.length === 0 && rewards.length === 0 ? (
              <p className="mt-4 text-center text-sm text-vibes-600">لا توجد حركات</p>
            ) : (
              <div className="mt-3 space-y-3">
                {cups.map((cup) => (
                  <div key={cup.id} className="flex items-center justify-between border-b border-vibes-100 pb-2 last:border-0">
                    <div className="flex items-center gap-3">
                      <Coffee className="size-4 text-vibes-600" />
                      <span className="text-sm">كوب #{cup.order_id?.slice(0, 6) || 'بدون طلب'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        cup.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        cup.status === 'redeemed' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {cup.status === 'active' ? 'نشط' : cup.status === 'redeemed' ? 'مستبدل' : 'ملغي'}
                      </span>
                    </div>
                    <div className="text-right text-xs text-vibes-500">
                      {new Date(cup.created_at).toLocaleDateString('ar-SA')}
                    </div>
                  </div>
                ))}
                {rewards.map((reward) => (
                  <div key={reward.id} className="flex items-center justify-between border-b border-vibes-100 pb-2 last:border-0">
                    <div className="flex items-center gap-3">
                      <Gift className="size-4 text-vibes-600" />
                      <span className="text-sm">مكافأة: {reward.reward_code}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        reward.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {reward.status === 'active' ? 'غير مستخدمة' : 'مستخدمة'}
                      </span>
                    </div>
                    <div className="text-right text-xs text-vibes-500">
                      {new Date(reward.created_at).toLocaleDateString('ar-SA')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* رابط تصميم البطاقة */}
          <Link to="/card-designer" className="block w-full rounded-2xl bg-vibes-800 py-3.5 text-center font-bold text-white transition hover:bg-vibes-700">
            تخصيص بطاقتي 🎨
          </Link>
        </div>
      </div>
    </main>
  );
}
