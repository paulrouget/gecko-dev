/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "GeckoProfiler.h"
#include "nsDocShell.h"
#include "ProfilerMarkers.h"

void profiler_tracing(const char* aCategory, const char* aInfo,
                                     nsDocShell* aDocShell,
                                     TracingMetadata aMetaData)
{
  aDocShell->AddTimelineMarker(aCategory, aInfo, aMetaData);
  profiler_tracing(aCategory, aInfo, aMetaData);
}

void profiler_tracing(const char* aCategory, const char* aInfo,
                                     ProfilerBacktrace* aCause,
                                     nsDocShell* aDocShell,
                                     TracingMetadata aMetaData)
{
  aDocShell->AddTimelineMarker(aCategory, aInfo, aCause, aMetaData);
  profiler_tracing(aCategory, aInfo, aCause, aMetaData);
}
