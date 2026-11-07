/** Bengali-capable font stack for every Education surface. */
export function EduFonts() {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return (
    <style>{`@font-face{font-family:"Education Bengali";src:url("${base}/api/education/font") format("truetype");font-weight:100 900;font-display:swap;unicode-range:U+0980-09FF}
      .education-tool-content{font-family:Inter,"Education Bengali",system-ui,sans-serif}
      .education-tool-content [class*="Poppins"]{font-family:Poppins,"Education Bengali",system-ui,sans-serif}`}</style>
  );
}
