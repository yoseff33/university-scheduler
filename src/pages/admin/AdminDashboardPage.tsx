import { useEffect, useState } from 'react'
import { Package, ShoppingBag, Store, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { AdminHeader, AdminNotice } from './AdminUi'

type Counts={orders:number;customers:number;products:number;branches:number}
export function AdminDashboardPage(){const[counts,setCounts]=useState<Counts>({orders:0,customers:0,products:0,branches:0});const[error,setError]=useState<string|null>(null)
useEffect(()=>{const c=supabase;if(!c)return;void Promise.all([c.from('orders').select('id',{count:'exact',head:true}),c.from('profiles').select('id',{count:'exact',head:true}),c.from('products').select('id',{count:'exact',head:true}),c.from('branches').select('id',{count:'exact',head:true})]).then(([o,u,p,b])=>{const e=o.error??u.error??p.error??b.error;if(e)setError(e.message);else setCounts({orders:o.count??0,customers:u.count??0,products:p.count??0,branches:b.count??0})})},[])
const cards=[['الطلبات',counts.orders,ShoppingBag],['العملاء',counts.customers,Users],['المنتجات',counts.products,Package],['الفروع',counts.branches,Store]] as const
return <section className="p-4 sm:p-6"><AdminHeader title="لوحة التحكم" description="ملخص مباشر لبيانات فايبز."/><AdminNotice error={error}/><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value,Icon])=><div key={label} className="rounded-3xl bg-white p-5 shadow-sm"><Icon className="size-7 text-vibes-700"/><p className="mt-4 text-3xl font-black text-vibes-900">{value}</p><p className="text-sm text-vibes-600">{label}</p></div>)}</div></section>}
