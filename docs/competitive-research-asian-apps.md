# Competitive Research: Asian Travel Apps

## Overview

Research into Asian travel planning apps that offer AI-powered content import and social media integration, identifying features and patterns relevant to Trip Planner's SOURCES tab.

## App Analysis

### 圆周旅迹 (Yuanzhou Lvji)
- **AI Import**: Paste Xiaohongshu/Douyin links → auto-extract itinerary
- **Key Feature**: Route optimization after import
- **Relevance**: Direct competitor for our AI text parsing feature

### 小红书 (Xiaohongshu / RED)
- **Travel Content**: Massive UGC travel content library
- **Format**: Posts contain venue names, tips, photos with location tags
- **Integration**: Many apps offer "import from Xiaohongshu" functionality
- **Relevance**: Primary content source for our AI parser to handle

### 马蜂窝 (Mafengwo)
- **AI Features**: Smart itinerary generation from natural language
- **Content**: Structured travel guides with POIs, ratings, reviews
- **Key Feature**: "One-click copy itinerary" from travel diaries
- **Relevance**: Benchmark for structured data extraction quality

### 飞猪 (Fliggy / Alibaba Travel)
- **AI Features**: AI travel assistant for itinerary planning
- **Integration**: Deep integration with Amap for routing
- **Key Feature**: AI suggests activities based on destination + dates
- **Relevance**: Shows value of combining AI parsing with trip date context

### 穷游 (Qyer)
- **Content**: Long-form travel guides and trip reports
- **Key Feature**: "Trip planning" tool that extracts POIs from guides
- **Relevance**: Similar text-to-POI extraction use case

### Gooh旅记
- **AI Features**: AI-powered travel diary to itinerary conversion
- **Key Feature**: Photo-based location extraction
- **Relevance**: Future direction for image-based import

### 携程 (Ctrip / Trip.com)
- **AI Features**: TripGenie AI assistant
- **Content**: Comprehensive booking + planning platform
- **Key Feature**: Multi-modal AI that handles text, voice, and images
- **Relevance**: Enterprise-grade AI integration benchmark

### Klook
- **Focus**: Activity/experience booking
- **Key Feature**: Curated activity lists by destination
- **Relevance**: Spot categorization patterns (eat/go out/shops)

### Navitime (Japan)
- **Focus**: Japan-specific travel planning
- **Key Feature**: Public transit integration with itinerary
- **Relevance**: Transit-aware planning patterns

## Key Takeaways

1. **AI text import is table stakes** — every major Asian travel app now offers some form of content import
2. **Xiaohongshu is the #1 content source** — Chinese travelers share detailed venue info on RED
3. **Multilingual support is critical** — content comes in Chinese, Japanese, English, Korean
4. **Classification matters** — users expect items to be correctly categorized (food vs activity vs shopping)
5. **Deduplication is essential** — users paste similar content multiple times; stable IDs prevent bloat
6. **Confidence scoring** — AI-extracted items should be flagged as lower confidence than manually verified ones

## Feature Gap Analysis

| Feature | Competitors | Trip Planner |
|---------|------------|-------------|
| AI text parsing | Yes (all major apps) | Now implemented |
| URL source import | Yes | Already existed |
| Image-based import | Some (Gooh, Ctrip) | Future |
| Voice input | Ctrip TripGenie | Future |
| Auto-routing | 圆周旅迹, 飞猪 | Existing (Google Maps) |
| Social sharing | All | Not planned |
| Booking integration | Ctrip, Klook, Fliggy | Not planned |
