---
category: pod
plane_id: 
profit_likelihood: high
project: Podcasting 2.0
status: archived
tags:
  - pod
title: podping
type: reference
updated_at: "2026-05-17T09:08:48Z"
---

# Podping

`<podcast:podping>`

This element allows feed owners to signal to aggregators that the feed sends out [`Podping`](https://github.com/Podcastindex-org/podping) notifications when changes are made to it, reducing the need for frequent speculative feed polling.

### Parent

`<channel>`

### Count

Single

## Examples

```xml
 <podcast:podping usesPodping="true"/>
```
