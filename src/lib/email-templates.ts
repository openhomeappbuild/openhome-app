import { formatNZDayKey } from "@/lib/nz-time";

type Listing = {
  id: string;
  address: string;
  suburb: string;
  region: string;
  bedrooms: number | null;
  bathrooms: number | null;
  car_spaces: number | null;
  sale_method: string | null;
  sale_method_date: string | null;
  agent_name: string;
  agent_phone: string;
  agent_email: string;
  vendor_name: string | null;
  vendor_email: string | null;
  description_notes: string | null;
  area_notes: string | null;
};

type SimilarListing = {
  id: string;
  address: string;
  bedrooms: number | null;
  sale_method: string | null;
};

const SIGNATURE_HTML = (listing: Listing) => `
  <div style="margin-top:24px; padding-top:16px; border-top:1px solid #e7e2d4; font-size:12.5px; color:#524d40; line-height:1.7;">
    <b style="color:#14130f; font-size:13.5px;">${listing.agent_name}</b><br>
    Bayleys Queenstown<br>
    ${listing.agent_phone} &middot; ${listing.agent_email}<br>
    <a href="https://chriscampbell.co.nz" style="color:#14130f; font-weight:600;">chriscampbell.co.nz</a>
  </div>
`;

function unsubscribeFooter(appUrl: string, email: string) {
  return `
  <p style="margin-top:16px; font-size:11px; color:#93a0ae; line-height:1.5;">
    You're receiving this because you signed in at an open home.
    <a href="${appUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#93a0ae;">Unsubscribe</a>
  </p>`;
}

function saleMethodLine(listing: Listing) {
  if (!listing.sale_method) return "";
  if (!listing.sale_method_date) return `This property is going to ${listing.sale_method.toLowerCase()}.`;
  const date = new Date(listing.sale_method_date).toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return `This property is going to ${listing.sale_method.toLowerCase()}, closing <b>${date}</b>.`;
}

export function buildFollowupEmail({
  listing,
  firstName,
  email,
  dayKey,
  similarListings,
  appUrl,
  aiCopy,
}: {
  listing: Listing;
  firstName: string;
  email: string;
  dayKey: string;
  similarListings: SimilarListing[];
  appUrl: string;
  /** AI-written recap/area paragraphs from generateFollowupCopy, shared across the whole batch. Falls back to the plain template below when not given (Gemini not configured, or the call failed). */
  aiCopy?: { recap: string; areaBlurb: string } | null;
}): { subject: string; html: string } {
  const subject = `Thanks for visiting ${listing.address}`;
  const day = formatNZDayKey(dayKey, { weekday: "long", day: "numeric", month: "long" });

  const facts = [
    listing.bedrooms ? `${listing.bedrooms} bedrooms` : null,
    listing.bathrooms ? `${listing.bathrooms} bathrooms` : null,
    listing.car_spaces ? `${listing.car_spaces} car spaces` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const recap =
    aiCopy?.recap ??
    [
      `Thanks for coming through <b>${listing.address}</b> on ${day}.`,
      facts ? `It's a home with ${facts}${listing.description_notes ? "." : "."}` : "",
      listing.description_notes ?? "",
    ]
      .filter(Boolean)
      .join(" ");

  const areaBlurb =
    aiCopy?.areaBlurb ??
    listing.area_notes ??
    `${listing.suburb} is part of the ${listing.region} area, with local shops, schools and amenities close by.`;

  const similarHtml = similarListings.length
    ? `
    <p style="margin-top:18px;"><b>You might also like these listings:</b></p>
    ${similarListings
      .map(
        (l) => `
      <div style="border:1px solid #e7e2d4; border-radius:10px; padding:12px 14px; margin:8px 0;">
        <b>${l.address}</b>${l.bedrooms ? ` &mdash; ${l.bedrooms} bed` : ""}${l.sale_method ? ` &middot; ${l.sale_method}` : ""}
      </div>`
      )
      .join("")}
  `
    : "";

  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#14130f; font-size:14px; line-height:1.7; max-width:560px;">
    <h2 style="font-size:18px; margin-bottom:12px;">Great to meet you, ${firstName}</h2>
    <p>${recap}</p>
    <p style="margin-top:10px;"><b>About the area:</b> ${areaBlurb}</p>
    ${listing.sale_method ? `<p style="margin-top:10px;">${saleMethodLine(listing)}</p>` : ""}
    <p style="margin-top:14px;">If you'd like a private viewing or more detail on the property, just reply to this email or call me on ${listing.agent_phone}.</p>
    ${similarHtml}
    ${SIGNATURE_HTML(listing)}
    ${unsubscribeFooter(appUrl, email)}
  </div>`;

  return { subject, html };
}

export function buildSellerReportEmail({
  listing,
  dayKey,
  stats,
  appUrl,
}: {
  listing: Listing;
  dayKey: string;
  stats: { total: number; local: number; outOfArea: number; repeat: number; consented: number };
  appUrl: string;
}): { subject: string; html: string } {
  const day = formatNZDayKey(dayKey, { weekday: "long", day: "numeric", month: "long" });
  const subject = `Open home report — ${listing.address}, ${day}`;
  const vendorFirstName = (listing.vendor_name ?? "there").split(" ")[0];

  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#14130f; font-size:14px; line-height:1.7; max-width:560px;">
    <h2 style="font-size:18px; margin-bottom:12px;">Hi ${vendorFirstName},</h2>
    <p>Here's the summary from the open home at <b>${listing.address}</b> on ${day}.</p>
    <div style="background:#faf8f3; border:1px solid #e7e2d4; border-radius:10px; padding:14px 18px; margin:14px 0;">
      <b>${stats.total} group${stats.total === 1 ? "" : "s"} through</b><br>
      ${stats.local} local &middot; ${stats.outOfArea} from out of area<br>
      ${stats.repeat} repeat visitor${stats.repeat === 1 ? "" : "s"}<br>
      ${stats.consented} opted in to follow-up on future listings
    </div>
    <p>I'll be in touch to talk through the feedback and next steps.</p>
    ${SIGNATURE_HTML(listing)}
    ${unsubscribeFooter(appUrl, listing.vendor_email ?? "")}
  </div>`;

  return { subject, html };
}
