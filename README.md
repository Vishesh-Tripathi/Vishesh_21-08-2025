🚀 Ideas for Improving the Solution

Partial Interval Handling

Currently, uptime/downtime might be overcounted if a store changes status in the middle of a business hour window.

Improve by splitting uptime/downtime into minute-level granularity instead of just status-change timestamps.

More Accurate “Last Hour / Last Day / Last Week”

Right now, the calculation assumes logs cover all working windows.

A more robust approach is to simulate status across all working minutes between start & end time, filling missing gaps with the last known status.

Timezone Edge Cases

Support for:

DST (Daylight Savings Time) transitions.

Overnight business hours (e.g., 22:00–02:00 crossing midnight).

Add more unit tests specifically for these tricky time ranges.

Scalability

For large datasets:

Pre-compute and cache minute-level statuses.

Use batch aggregation queries instead of iterating over each store.

Consider a streaming approach if logs are coming in real time.

Configurable Report Windows

Instead of hardcoding "last hour/day/week," allow user to pass arbitrary date ranges (e.g., "last 3 days" or "custom time window").

Data Quality Handling

Handle missing/duplicate/contradictory status logs more gracefully.

Provide warnings when logs don’t overlap with business hours.

Reporting Enhancements

Output in multiple formats (CSV, JSON, API endpoint).

Add percentage uptime/downtime in addition to minutes.

Provide visualizations (uptime charts, downtime heatmaps).

Testing & Validation

Add unit tests for:

Boundary cases (store open exactly at midnight).

Multiple overlapping business hours.

Status logs outside business hours.

Include regression tests with sample datasets.
