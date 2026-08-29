import {STORAGE_KEY,LEGACY_KEYS,makeSeed,uid,todayYmd,categoryIdByName,accountValue,cycleFor,netWorth,operatingAccount} from '../domain/model.js'

function mergeCategories(oldCats, freshCats){
  const byName=new Map((oldCats||[]).map(c=>[c.name,c]))
  return freshCats.map(c=>({...c,...(byName.get(c.name)||{}),id:byName.get(c.name)?.id||c.id,active:byName.get(c.name)?.active??true}))
}

export function migrateState(old){
  const base=makeSeed()
  if(!old) return base
  if(old.schemaVersion===5) return old
  // v4 → v5: preserve IDs where useful and replace duplicated goal funding with linked accounts.
  if(old.assets || old.liabilities){
    const categories=mergeCategories(old.categories,base.categories)
    const nameToCategory=Object.fromEntries(categories.map(c=>[c.name,c.id]))
    const goals=(old.goals||base.goals).map(g=>({id:g.id||uid(),name:g.name,target:Number(g.target)||0,priority:Number(g.priority)||9,targetDate:g.targetDate||'',note:g.note||''}))
    const homeGoal=goals.find(g=>g.name==='Home renovation')
    const accounts=(old.assets||[]).map(a=>{
      const typeMap={gold:'gold_fund',investment:'investment',cash:'cash',physical_gold:'physical_gold',retirement:'retirement'}
      const isCib=/cib current/i.test(a.name||'')
      const isRenovation=/home renovation/i.test(a.name||'')
      return {id:a.id||uid(),name:a.name||'Account',type:typeMap[a.type]||a.type||'investment',balance:Number(a.balance)||0,qty:Number(a.qty)||0,unitPrice:Number(a.unitPrice)||0,karat:a.karat||'',liquid:a.type==='cash',operating:isCib,goalId:isRenovation?homeGoal?.id:null,monthlyContribution:Number(a.monthly)||0,annualRate:Number(a.rate)||0,note:a.earmark||''}
    })
    const cards=(old.liabilities||[]).filter(l=>l.type==='credit_card').map(l=>({id:l.id||uid(),name:l.name||'Credit card',balance:Number(l.balance)||0,dueDay:Number(l.dueDay)||5,autopay:true}))
    const transactions=(old.transactions||[]).map(t=>({
      id:t.id||uid(),date:t.date||todayYmd(),kind:t.type==='transfer'?'transfer':'expense',amount:Number(t.amount)||0,categoryId:t.categoryId||nameToCategory['Needs review'],note:t.note||t.description||'',merchant:t.merchant||'',accountId:t.accountId||null,cardId:t.cardId||null,toAccountId:t.toAccountId||null,affectsBalance:t.affectsBalance??false,source:t.source||'legacy'
    }))
    return {
      ...base,
      profile:{...base.profile,...old.profile},
      settings:{...base.settings,...old.settings,liquidReserve:Number(old.profile?.liquidReserve??old.rules?.liquidReserve??base.settings.liquidReserve),monthlySpendingTarget:Number(old.spendingTarget??base.settings.monthlySpendingTarget)},
      rules:{...base.rules,...old.rules}, categories, goals, accounts:accounts.length?accounts:base.accounts, cards:cards.length?cards:base.cards,
      transactions, cardPayments:old.cardPayments||[], snapshots:old.snapshots||[], cycleClosures:old.cycleClosures||[], milestones:old.milestones||base.milestones, fire:{...base.fire,...old.fire}, schemaVersion:5
    }
  }
  return base
}

export function loadState(){
  try{
    const direct=localStorage.getItem(STORAGE_KEY)
    if(direct) return migrateState(JSON.parse(direct))
    for(const key of LEGACY_KEYS){
      const value=localStorage.getItem(key)
      if(value) return migrateState(JSON.parse(value))
    }
  }catch(err){ console.warn('FinOS state load failed',err) }
  return makeSeed()
}
export const saveState=state=>localStorage.setItem(STORAGE_KEY,JSON.stringify(state))

function updateAccount(accounts,id,delta){ return accounts.map(a=>a.id===id?{...a,balance:Math.max(0,(Number(a.balance)||0)+delta)}:a) }
function updateCard(cards,id,delta){ return cards.map(c=>c.id===id?{...c,balance:Math.max(0,(Number(c.balance)||0)+delta)}:c) }

export function reducer(state,action){
  switch(action.type){
    case 'ADD_EXPENSE': {
      const t={id:uid(),date:action.date||todayYmd(),kind:'expense',amount:Number(action.amount)||0,categoryId:action.categoryId,note:action.note||'',merchant:action.merchant||'',accountId:action.accountId||null,cardId:action.cardId||null,affectsBalance:action.affectsBalance!==false,source:action.source||'manual'}
      let accounts=state.accounts, cards=state.cards
      if(t.affectsBalance && t.accountId) accounts=updateAccount(accounts,t.accountId,-t.amount)
      if(t.affectsBalance && t.cardId) cards=updateCard(cards,t.cardId,t.amount)
      return {...state,accounts,cards,transactions:[t,...state.transactions]}
    }
    case 'DELETE_TRANSACTION': {
      const t=state.transactions.find(x=>x.id===action.id); if(!t) return state
      let accounts=state.accounts,cards=state.cards
      if(t.affectsBalance && t.kind==='expense' && t.accountId) accounts=updateAccount(accounts,t.accountId,t.amount)
      if(t.affectsBalance && t.kind==='expense' && t.cardId) cards=updateCard(cards,t.cardId,-t.amount)
      if(t.affectsBalance && t.kind==='transfer'){
        if(t.fromAccountId) accounts=updateAccount(accounts,t.fromAccountId,t.amount)
        if(t.toAccountId) accounts=updateAccount(accounts,t.toAccountId,-t.amount)
      }
      return {...state,accounts,cards,transactions:state.transactions.filter(x=>x.id!==action.id)}
    }
    case 'TRANSFER': {
      const amount=Number(action.amount)||0
      if(amount<=0 || action.fromAccountId===action.toAccountId) return state
      const from=state.accounts.find(a=>a.id===action.fromAccountId)
      if(!from || accountValue(from)<amount) return state
      let accounts=updateAccount(state.accounts,action.fromAccountId,-amount)
      accounts=updateAccount(accounts,action.toAccountId,amount)
      const t={id:uid(),date:action.date||todayYmd(),kind:'transfer',amount,fromAccountId:action.fromAccountId,toAccountId:action.toAccountId,note:action.note||'',affectsBalance:true,source:'manual'}
      return {...state,accounts,transactions:[t,...state.transactions]}
    }
    case 'PAY_CARD': {
      const card=state.cards.find(c=>c.id===action.cardId), from=state.accounts.find(a=>a.id===action.fromAccountId)
      const amount=Math.min(Number(action.amount)||Number(card?.balance)||0,Number(card?.balance)||0)
      if(!card||!from||amount<=0||accountValue(from)<amount) return state
      const cycle=cycleFor(new Date(),state.settings.cycleDay)
      const accounts=updateAccount(state.accounts,from.id,-amount)
      const cards=updateCard(state.cards,card.id,-amount)
      const tx={id:uid(),date:action.date||todayYmd(),kind:'card_payment',amount,fromAccountId:from.id,cardId:card.id,note:`Payment to ${card.name}`,affectsBalance:true,source:'manual'}
      const status=(Number(card.balance)-amount)<=0.01?'paid':'partial'
      const cardPayments=[...state.cardPayments.filter(p=>!(p.cardId===card.id&&p.cycleStart===cycle.start)),{id:uid(),cardId:card.id,cycleStart:cycle.start,date:tx.date,amount,status}]
      return {...state,accounts,cards,transactions:[tx,...state.transactions],cardPayments}
    }
    case 'MARK_CARD_PAID': {
      const cycle=cycleFor(new Date(),state.settings.cycleDay)
      const cardPayments=[...state.cardPayments.filter(p=>!(p.cardId===action.cardId&&p.cycleStart===cycle.start)),{id:uid(),cardId:action.cardId,cycleStart:cycle.start,date:todayYmd(),amount:0,status:'paid',external:true}]
      return {...state,cardPayments}
    }
    case 'UPDATE_CATEGORY_BUDGET': return {...state,categories:state.categories.map(c=>c.id===action.id?{...c,budget:Math.max(0,Number(action.budget)||0)}:c)}
    case 'SET_MONTHLY_TARGET': return {...state,settings:{...state.settings,monthlySpendingTarget:Math.max(0,Number(action.value)||0)}}
    case 'UPDATE_ACCOUNT': return {...state,accounts:state.accounts.map(a=>a.id===action.account.id?action.account:a)}
    case 'ADD_ACCOUNT': return {...state,accounts:[...state.accounts,action.account]}
    case 'UPDATE_CARD': return {...state,cards:state.cards.map(c=>c.id===action.card.id?action.card:c)}
    case 'UPDATE_GOAL': return {...state,goals:state.goals.map(g=>g.id===action.goal.id?action.goal:g)}
    case 'ADD_GOAL': return {...state,goals:[...state.goals,action.goal]}
    case 'UPDATE_SETTINGS': return {...state,profile:{...state.profile,...(action.profile||{})},settings:{...state.settings,...(action.settings||{})},fire:{...state.fire,...(action.fire||{})}}
    case 'IMPORT_TRANSACTIONS': return {...state,transactions:[...action.transactions,...state.transactions]}
    case 'CLOSE_CYCLE': {
      const exists=state.cycleClosures.some(c=>c.cycleStart===action.closure.cycleStart)
      const closures=exists?state.cycleClosures.map(c=>c.cycleStart===action.closure.cycleStart?action.closure:c):[...state.cycleClosures,action.closure]
      const snapshot={id:uid(),date:action.closure.cycleEnd,cycleStart:action.closure.cycleStart,netWorth:netWorth(state),assets:state.accounts.map(a=>({id:a.id,name:a.name,value:accountValue(a)})),liabilities:state.cards.map(c=>({id:c.id,name:c.name,value:Number(c.balance)||0}))}
      const snapshots=[...state.snapshots.filter(s=>s.cycleStart!==snapshot.cycleStart),snapshot]
      return {...state,cycleClosures:closures,snapshots}
    }
    case 'SAVE_SNAPSHOT': {
      const c=cycleFor(new Date(),state.settings.cycleDay), snapshot={id:uid(),date:todayYmd(),cycleStart:c.start,netWorth:netWorth(state),assets:state.accounts.map(a=>({id:a.id,name:a.name,value:accountValue(a)})),liabilities:state.cards.map(x=>({id:x.id,name:x.name,value:Number(x.balance)||0}))}
      return {...state,snapshots:[...state.snapshots.filter(s=>s.cycleStart!==c.start),snapshot]}
    }
    case 'RESET_DEMO': return makeSeed()
    default:return state
  }
}
