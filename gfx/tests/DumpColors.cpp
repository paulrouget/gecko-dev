/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * The contents of this file are subject to the Netscape Public License
 * Version 1.0 (the "NPL"); you may not use this file except in
 * compliance with the NPL.  You may obtain a copy of the NPL at
 * http://www.mozilla.org/NPL/
 *
 * Software distributed under the NPL is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the NPL
 * for the specific language governing rights and limitations under the
 * NPL.
 *
 * The Initial Developer of this code under the NPL is Netscape
 * Communications Corporation.  Portions created by Netscape are
 * Copyright (C) 1998 Netscape Communications Corporation.  All Rights
 * Reserved.
 */

#include <stdio.h>
#include "nsColor.h"
#include "nsColorNames.h"
#include "nsString.h"

int main(int argc, char** argv)
{
  char  buffer[1024];
  for (int i = 0; i < eColorName_COUNT; i++) {
    nscolor rgba = nsColorNames::kColors[i];
    nsColorNames::GetStringValue(nsColorName(i)).ToCString(buffer, sizeof(buffer));
    printf("%s: NS_RGB(%d,%d,%d,%d)\n", buffer,
	   NS_GET_R(rgba), NS_GET_G(rgba), NS_GET_B(rgba), NS_GET_A(rgba));
  }
  return 0;
}
