(() => {
  const cfg = window.TUSHAR_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const loginView = $("loginView"), appView = $("appView");
  const content = $("content"), notice = $("notice");
  let db, currentUser, currentPage = "overview";

  const titles = {
    overview:"Dashboard Overview", users:"User Management", licenses:"License Management",
    devices:"Device Management", presets:"Preset Library", updates:"Plugin Updates",
    announcements:"Announcements", logs:"Admin Activity Logs"
  };

  function showNotice(msg, bad=false) {
    notice.textContent = msg;
    notice.className = "notice" + (bad ? " error" : "");
    notice.classList.remove("hidden");
  }
  function hideNotice(){ notice.classList.add("hidden"); }
  function esc(v){ return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function date(v){ return v ? new Date(v).toLocaleString() : "—"; }
  function setView(loggedIn) {
    loginView.classList.toggle("hidden", loggedIn);
    appView.classList.toggle("hidden", !loggedIn);
  }

  async function init() {
    if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_PUBLISHABLE_KEY) {
      $("loginMessage").textContent = "Supabase configuration is missing. Check config.js.";
      return;
    }
    db = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);
    const { data:{session} } = await db.auth.getSession();
    if (session) await enterApp(session.user);
    db.auth.onAuthStateChange(async (_event, session) => {
      if (session && !currentUser) await enterApp(session.user);
      if (!session) { currentUser = null; setView(false); }
    });
  }

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("loginMessage").textContent = "Signing in…";
    const { data, error } = await db.auth.signInWithPassword({
      email: $("email").value.trim(), password: $("password").value
    });
    if (error) { $("loginMessage").textContent = error.message; return; }
    await enterApp(data.user);
  });

  async function enterApp(user) {
    currentUser = user;
    const { data:allowed, error } = await db.rpc("is_admin");
    if (error || allowed !== true) {
      await db.auth.signOut();
      $("loginMessage").textContent = "This account does not have active administrator permission.";
      setView(false);
      return;
    }
    $("adminEmail").textContent = user.email || "Owner";
    setView(true);
    await loadPage("overview");
  }

  $("logoutBtn").addEventListener("click", async () => { await db.auth.signOut(); currentUser=null; setView(false); });
  $("refreshBtn").addEventListener("click", () => loadPage(currentPage));
  $("nav").addEventListener("click", e => {
    const b = e.target.closest("[data-page]");
    if (b) loadPage(b.dataset.page);
  });

  async function rows(table, select="*") {
    const {data,error} = await db.from(table).select(select).order("created_at",{ascending:false}).limit(100);
    if (error) throw error;
    return data || [];
  }
  function tableHTML(items, columns) {
    if (!items.length) return `<div class="empty">No records yet.</div>`;
    return `<div class="table-wrap"><table><thead><tr>${columns.map(c=>`<th>${esc(c.label)}</th>`).join("")}</tr></thead><tbody>${
      items.map(item=>`<tr>${columns.map(c=>`<td>${esc(c.render ? c.render(item) : item[c.key])}</td>`).join("")}</tr>`).join("")
    }</tbody></table></div>`;
  }
  function stat(label,value,sub="Live database count") {
    return `<div class="stat"><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-sub">${sub}</div></div>`;
  }
  async function count(table) {
    const {count,error}=await db.from(table).select("*",{count:"exact",head:true});
    if (error) throw error; return count ?? 0;
  }

  async function loadPage(page) {
    currentPage=page; hideNotice();
    $("pageTitle").textContent=titles[page] || "Dashboard";
    $("pageCrumb").textContent=(page || "overview").toUpperCase();
    document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
    content.innerHTML='<div class="loading">Loading secure database data…</div>';
    try {
      if (page==="overview") {
        const [u,l,d,p,r,a] = await Promise.all([
          count("profiles"),count("licenses"),count("devices"),count("preset_library"),count("plugin_updates"),count("announcements")
        ]);
        content.innerHTML = `<div class="welcome"><div><div class="eyebrow">OWNER WORKSPACE</div><h1>Welcome back.</h1><p>Manage your TUSHAR PRO ecosystem from one place.</p></div><div class="pill"><i></i> OWNER VERIFIED</div></div>
          <div class="stats">${stat("Registered users",u)}${stat("Licenses",l)}${stat("Registered devices",d)}${stat("Preset assets",p)}${stat("Plugin releases",r)}${stat("Announcements",a)}</div>
          <div class="panel"><h3>Administration status</h3><p class="muted">Your Owner account passed the server-side admin permission check. Payment processing is intentionally not enabled yet.</p><div class="status-line"><span class="status-dot"></span> Authentication active <span class="status-dot"></span> RLS protected tables</div></div>`;
      } else if (page==="users") {
        const data=await rows("profiles");
        content.innerHTML=`<div class="panel"><h3>Registered users</h3><p class="muted">Latest 100 profiles visible to administrators.</p>${tableHTML(data,[{label:"User ID",key:"user_id"},{label:"Name",key:"display_name"},{label:"Status",key:"account_status"},{label:"Created",key:"created_at",render:x=>date(x.created_at)}])}</div>`;
      } else if (page==="licenses") {
        const data=await rows("licenses");
        content.innerHTML=`<div class="panel"><h3>Licenses</h3><p class="muted">Free/Premium plan records. Payment automation is not enabled.</p>${tableHTML(data,[{label:"User ID",key:"user_id"},{label:"Plan",key:"plan"},{label:"Status",key:"status"},{label:"Expires",key:"expires_at",render:x=>date(x.expires_at)}])}</div>`;
      } else if (page==="devices") {
        const data=await rows("devices");
        content.innerHTML=`<div class="panel"><h3>Devices</h3><p class="muted">Device registrations. The database trigger enforces two active records per user.</p>${tableHTML(data,[{label:"User ID",key:"user_id"},{label:"Device",key:"device_name"},{label:"Version",key:"app_version"},{label:"Active",key:"is_active"},{label:"Last seen",key:"last_seen_at",render:x=>date(x.last_seen_at)}])}`;
      } else if (page==="presets") {
        const data=await rows("preset_library");
        content.innerHTML=`<div class="panel"><h3>Preset Library</h3><p class="muted">Preset metadata. Storage upload controls will be added after Storage bucket setup.</p>${tableHTML(data,[{label:"Name",key:"name"},{label:"Category",key:"category"},{label:"Plan",key:"required_plan"},{label:"Published",key:"is_published"},{label:"Created",key:"created_at",render:x=>date(x.created_at)}])}</div>`;
      } else if (page==="updates") {
        const data=await rows("plugin_updates");
        content.innerHTML=`<div class="panel"><h3>Plugin Updates</h3><p class="muted">Release records. Upload and publish workflow is a future step.</p>${tableHTML(data,[{label:"Version",key:"version"},{label:"Platform",key:"platform"},{label:"AE minimum",key:"min_ae_version"},{label:"Published",key:"is_published"},{label:"Created",key:"created_at",render:x=>date(x.created_at)}])}</div>`;
      } else if (page==="announcements") {
        const data=await rows("announcements");
        content.innerHTML=`<div class="panel"><h3>Announcements</h3><p class="muted">Published notices and maintenance messages.</p>${tableHTML(data,[{label:"Title",key:"title"},{label:"Type",key:"announcement_type"},{label:"Published",key:"is_published"},{label:"Starts",key:"starts_at",render:x=>date(x.starts_at)},{label:"Ends",key:"ends_at",render:x=>date(x.ends_at)}])}</div>`;
      } else if (page==="logs") {
        const data=await rows("admin_activity_logs");
        content.innerHTML=`<div class="panel"><h3>Admin activity</h3><p class="muted">Audit log records. Automatic logging actions will be wired in a later backend step.</p>${tableHTML(data,[{label:"Admin",key:"admin_user_id"},{label:"Action",key:"action"},{label:"Target",key:"target_type"},{label:"Time",key:"created_at",render:x=>date(x.created_at)}])}</div>`;
      }
    } catch(err) {
      content.innerHTML=`<div class="panel"><h3>Could not load this section</h3><p class="muted">${esc(err.message || "Unknown database error")}</p><p class="muted">Check the SQL schema, RLS policies and Supabase project configuration.</p></div>`;
    }
  }
  init();
})();