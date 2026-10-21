// Edge Function pública, mas com credenciais administrativas somente no servidor.
import { createClient } from 'npm:@supabase/supabase-js@2.95.0';
import { createCommentHandler } from './handler.mjs';

const projectUrl = Deno.env.get('SUPABASE_URL') || '';
let secret = '';
try {secret = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default || '';} catch { /* API antiga */ }
if (!secret) secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
if (!projectUrl || !secret) throw new Error('Configuração administrativa do Supabase indisponível.');
const client = createClient(projectUrl,secret,{auth:{persistSession:false,autoRefreshToken:false}});
function ensure(result) {if(result.error)throw result.error;return result.data;}
const backend={
  async list(id){return ensure(await client.from('oitutigas_comments').select('id,question_id,author_name,body,created_at')
    .eq('question_id',id).order('created_at',{ascending:false}).limit(100));},
  async allowPost(ipHash){return ensure(await client.rpc('oitutigas_try_post',{p_ip_hash:ipHash}))===true;},
  async insert(row){return ensure(await client.from('oitutigas_comments').insert(row)
    .select('id,question_id,author_name,body,created_at').single());},
  async getForDelete(id){return ensure(await client.from('oitutigas_comments')
    .select('id,delete_token_hash').eq('id',id).maybeSingle());},
  async deleteByAuthor(id,hash){return ensure(await client.from('oitutigas_comments').delete()
    .eq('id',id).eq('delete_token_hash',hash).select('id').maybeSingle());},
  async deleteByAdmin(id){return ensure(await client.from('oitutigas_comments').delete()
    .eq('id',id).select('id').maybeSingle());}
};
Deno.serve(createCommentHandler(backend,{
  allowedOrigins:Deno.env.get('OITUTIGAS_ALLOWED_ORIGINS')||'https://jompas19.github.io',
  ipSalt:Deno.env.get('OITUTIGAS_IP_SALT')||secret,
  adminToken:Deno.env.get('OITUTIGAS_ADMIN_TOKEN')||''
}));
