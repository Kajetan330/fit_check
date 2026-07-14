# QA Checklist

Run before every production deploy.

## Automated

```bash
npm run check
```

## Manual Customer Flow

- Open `/`.
- Search/filter creators.
- Open `/creator/amara-okafor`.
- Save creator and save a post.
- Sign in as customer.
- Open `/book/amara-okafor/wardrobe-audit`.
- Complete booking intake.
- Confirm booking.
- Verify booking appears in `/bookings`.
- Open booking detail and inspect timeline/lookbook states.
- Add a closet item at `/closet`.

## Manual Creator Flow

- Sign in as creator.
- Open `/studio`.
- Save profile draft.
- Publish a local post.
- Open public creator profile and verify the draft/post appears.
- Move a booking to ready/completed.

## Manual Admin Flow

- Open `/admin`.
- Continue as admin.
- Approve/reject a creator application.
- Review open bookings.
- Open `/launch`.
- Open legal draft pages.

## Brand And Media

- Verify no external stock image URLs remain in source.
- Verify `public/assets/media/` images render on Discover, profiles, posts, closet, and lookbook.
- Verify `public/brand/fitcheck-mark.svg`, `fitcheck-wordmark.svg`, and `public/icon.svg` open correctly.

## Responsive Checks

- iPhone SE width.
- Standard mobile width around 390px.
- Tablet width around 768px.
- Desktop width above 1200px.
