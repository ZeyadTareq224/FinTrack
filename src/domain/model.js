export const STORAGE_KEY = 'finos-state-v5'
export const LEGACY_KEYS = ['finos-state-v4','finos-state-v3','finos-state-v1','wealthos-state-v1']
export const CYCLE_DAY = 28

export const uid = () => globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
export const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
export const parseYmd = s => { const [y,m,d]=(s||'').split('-').map(Number); return new Date(y,m-1,d) }
export const todayYmd = () => ymd(new Date())
export const clamp = (n,a,b) => Math.min(Math.max(Number(n)||0,a),b)
export const money = (n,dec=0) => `${new Intl.NumberFormat('en-EG',{maximumFractionDigits:dec,minimumFractionDigits:dec}).format(Number(n)||0)} EGP`

export function cycleFor(date=new Date(),day=CYCLE_DAY){
  const start = date.getDate()>=day ? new Date(date.getFullYear(),date.getMonth(),day) : new Date(date.getFullYear(),date.getMonth()-1,day)
  const end = new Date(start.getFullYear(),start.getMonth()+1,day-1)
  return {start:ymd(start),end:ymd(end),label:end.toLocaleDateString('en-US',{month:'long',year:'numeric'})}
}
export function cycleFromStart(start,day=CYCLE_DAY){
  const s=parseYmd(start), end=new Date(s.getFullYear(),s.getMonth()+1,day-1)
  return {start,end:ymd(end),label:end.toLocaleDateString('en-US',{month:'long',year:'numeric'})}
}
export function shiftCycle(start,n){ const d=parseYmd(start); d.setMonth(d.getMonth()+n); return ymd(d) }
export const inCycle = (date,cycle) => !!date && date>=cycle.start && date<=cycle.end

export const categoryTemplates = [
  ['Groceries',2000,'flex','groceries'],['Eating out',0,'flex','eating'],['Food delivery / Talabat',100,'flex','delivery'],['Uber / ride-hailing',100,'flex','uber'],['Public transport',0,'flex','transport'],
  ['Fuel',200,'flex','fuel'],['Parking / tolls',0,'flex','parking'],['Car maintenance',0,'flex','car'],
  ['Swimming',1500,'fixed','swimming'],['Gym sinking fund',1333,'fixed','gym'],['Supplements',100,'flex','supplements'],['Sports gear',0,'flex','sportsgear'],
  ['Mother gam3ya',500,'fixed','family'],['Family support',0,'flex','family'],['Gifts / social',0,'flex','gift'],['Charity',0,'flex','charity'],
  ['Home internet',800,'fixed','internet'],['Mobile',300,'fixed','phone'],['Amazon Prime',27,'fixed','subscription'],['Other subscriptions',0,'fixed','subscription'],['Bank / card fees',43,'fixed','fees'],
  ['Pharmacy / medicine',0,'flex','health'],['Doctor / dentist',0,'flex','doctor'],['Personal care',0,'flex','care'],['Clothes',0,'flex','clothes'],['Electronics',0,'flex','electronics'],
  ['Home supplies',0,'flex','home'],['Entertainment',0,'flex','entertainment'],['Gaming',0,'flex','gaming'],['Travel',0,'flex','travel'],['Pocket cash',300,'flex','cash'],
  ['Education / courses',0,'flex','education'],['Government fees',0,'flex','government'],['Coffee / snacks',0,'flex','coffee'],['Other shopping',0,'flex','shopping'],['Miscellaneous',0,'flex','misc'],['Needs review',0,'flex','review']
]
export const makeCategories = () => categoryTemplates.map(([name,budget,kind,icon])=>({id:uid(),name,budget,kind,icon,active:true}))
export const categoryIdByName = (categories,name) => categories.find(c=>c.name===name)?.id || ''

export function makeSeed(){
  const categories=makeCategories()
  const homeGoalId=uid(), honeymoonGoalId=uid()
  const cibId=uid(), pocketId=uid(), teldaId=uid(), renovationId=uid(), bsbId=uid(), goldId=uid(), retirementId=uid(), cardId=uid()
  return {
    schemaVersion:5,
    profile:{age:27,salary:30000,retirementAge:65,paydayWindow:'24–29'},
    settings:{cycleDay:28,liquidReserve:10000,monthlySpendingTarget:7303},
    rules:{noCardInterest:true,noRetirementTouch:true,retirementFirst:true,overspendCostsGoal:true},
    categories,
    accounts:[
      {id:cibId,name:'CIB current account',type:'cash',balance:52930,liquid:true,operating:true,goalId:null,monthlyContribution:0,annualRate:0,note:'Primary operating account'},
      {id:pocketId,name:'Pocket cash',type:'cash',balance:390,liquid:true,operating:false,goalId:null,monthlyContribution:0,annualRate:0,note:'Cash in wallet'},
      {id:teldaId,name:'Telda',type:'cash',balance:87.39,liquid:true,operating:false,goalId:null,monthlyContribution:0,annualRate:0,note:'Uber / Talabat / Prime'},
      {id:renovationId,name:'Home Renovation · Klouds',type:'investment',balance:72403,liquid:false,operating:false,goalId:homeGoalId,monthlyContribution:0,annualRate:20,note:'Dedicated renovation bucket'},
      {id:bsbId,name:'BSB Gold Fund',type:'gold_fund',balance:75088,liquid:false,operating:false,goalId:null,monthlyContribution:0,annualRate:0,note:'Flexible future marriage / wealth'},
      {id:goldId,name:'Physical gold',type:'physical_gold',balance:0,qty:20,unitPrice:0,karat:'24K',liquid:false,operating:false,goalId:null,monthlyContribution:0,annualRate:0,note:'Renovation backup; preserve some for engagement rings if possible'},
      {id:retirementId,name:'Retirement · Klouds',type:'retirement',balance:0,liquid:false,operating:false,goalId:null,monthlyContribution:6500,annualRate:5,note:'Never touch'}
    ],
    cards:[{id:cardId,name:'CIB credit card',balance:12655.28,dueDay:5,autopay:true}],
    goals:[
      {id:homeGoalId,name:'Home renovation',target:350000,priority:1,targetDate:'2027-01-01',note:'Main renovation only: electrical, plumbing, ceramic, painting, doors, windows, bathroom.'},
      {id:honeymoonGoalId,name:'Honeymoon',target:100000,priority:3,targetDate:'',note:'Build gradually. Marriage is not scheduled yet.'}
    ],
    milestones:[{id:uid(),name:'First 1M',target:1000000,priority:2}],
    transactions:[],
    cardPayments:[],
    cycleClosures:[],
    snapshots:[],
    fire:{monthlyLifestyle:25300,withdrawalRate:3.5,realReturn:5}
  }
}

export const accountValue = a => a.type==='physical_gold' ? (Number(a.qty)||0)*(Number(a.unitPrice)||0) : Number(a.balance)||0
export const assetsTotal = state => state.accounts.reduce((s,a)=>s+accountValue(a),0)
export const liabilitiesTotal = state => state.cards.reduce((s,c)=>s+(Number(c.balance)||0),0)
export const netWorth = state => assetsTotal(state)-liabilitiesTotal(state)
export const liquidTotal = state => state.accounts.filter(a=>a.liquid).reduce((s,a)=>s+accountValue(a),0)
export const budgetTotal = state => state.categories.filter(c=>c.active!==false && c.name!=='Needs review').reduce((s,c)=>s+(Number(c.budget)||0),0)
export const categorySpend = (state,categoryId,cycle) => state.transactions.filter(t=>t.kind==='expense' && t.categoryId===categoryId && inCycle(t.date,cycle)).reduce((s,t)=>s+(Number(t.amount)||0),0)
export const cycleExpenses = (state,cycle) => state.transactions.filter(t=>t.kind==='expense' && inCycle(t.date,cycle))
export const cycleSpent = (state,cycle) => cycleExpenses(state,cycle).reduce((s,t)=>s+(Number(t.amount)||0),0)
export const goalFunded = (state,goalId) => state.accounts.filter(a=>a.goalId===goalId).reduce((s,a)=>s+accountValue(a),0)
export const retirementAccount = state => state.accounts.find(a=>a.type==='retirement')
export const operatingAccount = state => state.accounts.find(a=>a.operating) || state.accounts.find(a=>a.type==='cash')
export const currentPriorityGoal = state => [...state.goals].sort((a,b)=>a.priority-b.priority)[0]

export function fireTarget(fire){ return (Number(fire.monthlyLifestyle)||0)*12/((Number(fire.withdrawalRate)||3.5)/100) }
export function futureValue(balance,monthly,annualRate,years){
  const n=Math.max(0,Math.round(years*12)), mr=Math.pow(1+(Number(annualRate)||0)/100,1/12)-1
  if(!n) return Number(balance)||0
  if(Math.abs(mr)<1e-9) return (Number(balance)||0)+(Number(monthly)||0)*n
  return (Number(balance)||0)*Math.pow(1+mr,n)+(Number(monthly)||0)*((Math.pow(1+mr,n)-1)/mr)
}
export function requiredMonthly(target,current,years,annualRate){
  const n=Math.max(1,Math.round(years*12)), mr=Math.pow(1+(Number(annualRate)||0)/100,1/12)-1
  if(Math.abs(mr)<1e-9) return Math.max(0,(target-current)/n)
  const grown=(Number(current)||0)*Math.pow(1+mr,n), gap=Math.max(0,target-grown)
  return gap/((Math.pow(1+mr,n)-1)/mr)
}

export function financialHealth(state,date=new Date()){
  const cycle=cycleFor(date,state.settings.cycleDay), spent=cycleSpent(state,cycle), target=state.settings.monthlySpendingTarget
  const liquid=liquidTotal(state), reserve=state.settings.liquidReserve
  const cardDue=state.cards.reduce((s,c)=>s+(Number(c.balance)||0),0)
  const retirement=retirementAccount(state)
  const retirementFunded=state.transactions.some(t=>t.kind==='transfer' && t.toAccountId===retirement?.id && inCycle(t.date,cycle))
  const cardPaid=state.cardPayments.some(p=>p.cycleStart===cycle.start && p.status==='paid') || cardDue===0
  return {cycle,spent,target,remaining:target-spent,liquid,reserve,cardDue,cardPaid,retirementFunded}
}
