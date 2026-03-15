import LandingContent from './landing/LandingContent';

export const metadata = {
  title: 'Trip Planner — Turn 50 Open Tabs Into One Trip Plan',
  description:
    "See where events are, when they conflict, where it's safe, and plan your trip with friends. Live crime heatmaps for SF, NYC, LA, and Chicago. Curated spots and Google Calendar export.",
  alternates: {
    canonical: 'https://trip.ianhsiao.me',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'Trip Planner',
      url: 'https://trip.ianhsiao.me',
      description:
        'Trip Planner consolidates city events from Luma and Beehiiv, curated restaurant and cafe spots, and live crime heatmaps onto one interactive Google Map. Covers SF, NYC, LA, and Chicago with official open data. Plan day-by-day itineraries, share plans with travel companions, and export to Google Calendar. Free, open source, built with Next.js 15.',
      applicationCategory: 'TravelApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      author: {
        '@type': 'Person',
        name: 'Ian Hsiao',
        url: 'https://twitter.com/ianhsiao',
      },
      featureList: [
        'Interactive Google Map with color-coded event and spot pins',
        'Live crime heatmap overlay from city open data (SF, NYC, LA, Chicago)',
        'Day-by-day drag-and-drop trip planner',
        'Shared pair planner for travel companions',
        'Google Calendar and iCal export',
        'Event aggregation from Luma calendars and Beehiiv newsletters',
        'Curated restaurant, cafe, bar, and shop recommendations',
        'Route lines between planned stops with time estimates',
      ],
      screenshot: 'https://trip.ianhsiao.me/screenshots/planning.png',
    },
    {
      '@type': 'WebSite',
      name: 'Trip Planner',
      url: 'https://trip.ianhsiao.me',
    },
    {
      '@type': 'WebPage',
      name: 'Trip Planner — Turn 50 Open Tabs Into One Trip Plan',
      url: 'https://trip.ianhsiao.me',
      description:
        "Plan your trip with events, curated spots, and live crime heatmaps on one interactive map. Covers SF, NYC, LA, and Chicago.",
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['h1', '.hero-description', '.faq-answer'],
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is Trip Planner?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Trip Planner is a free, open-source web app that puts city events, curated spots, and live crime heatmaps on one interactive Google Map. It aggregates events from Luma calendars and Beehiiv newsletters, lets you import restaurant and cafe recommendations, and overlays crime data from official city open data portals so you can see what is happening, where it is safe, and plan your days accordingly.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does the crime heatmap work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The crime heatmap pulls publicly available incident data from official city open data portals — including SFPD, NYPD, LAPD, and Chicago PD datasets. It overlays this data directly on the trip map so you can see which blocks had recent incidents before choosing restaurants or planning evening walks.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I plan a trip with friends?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Trip Planner includes a shared pair planner mode. Create a planner room, invite your travel companion, and both of you see each other\'s schedules side by side. Each person edits only their own itinerary, preventing conflicts while keeping plans synchronized.',
          },
        },
        {
          '@type': 'Question',
          name: 'How do I export my trip itinerary to Google Calendar?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Once you finish planning your days, export the full itinerary as an ICS file or sync directly to Google Calendar. Every event, time, and location transfers to your phone so your schedule is ready before you arrive.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is Trip Planner free to use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, Trip Planner is completely free to use. There are no paid tiers, no sign-up fees, and no feature gates. The project is open source under the GPL-3.0 license, and the full source code is available on GitHub. You can also fork the repository, add your own API keys, and deploy your own instance to Vercel.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I sponsor or support Trip Planner?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. If you find Trip Planner useful, you can support the project through Buy Me a Coffee. The widget is available on the site. You can also contribute code or report issues on the GitHub repository.',
          },
        },
        {
          '@type': 'Question',
          name: 'Which neighborhoods should I avoid?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Trip Planner helps you make informed decisions by showing a live crime heatmap sourced from official city police data. Toggle the heatmap overlay on the map to check safety around any event or restaurant before committing to your plans. Crime data is currently available for San Francisco, New York City, Los Angeles, and Chicago.',
          },
        },
      ],
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingContent />
    </>
  );
}
