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

#ifndef EditTxn_h__
#define EditTxn_h__

#include "nsITransaction.h"

class nsIDOMNode;

#define EDIT_TXN_IID \
{/* c5ea31b0-ac48-11d2-86d8-000064657374 */ \
0xc5ea31b0, 0xac48, 0x11d2, \
{0x86, 0xd8, 0x0, 0x0, 0x64, 0x65, 0x73, 0x74} }

/**
 * base class for all document editing transactions.
 * provides default concrete behavior for all nsITransaction methods.
 */
class EditTxn : public nsITransaction
{
public:

  NS_DECL_ISUPPORTS

  EditTxn();

  virtual nsresult Do(void);

  virtual nsresult Undo(void);

  virtual nsresult Redo(void);

  virtual nsresult GetIsTransient(PRBool *aIsTransient);

  virtual nsresult Merge(PRBool *aDidMerge, nsITransaction *aTransaction);

  virtual nsresult Write(nsIOutputStream *aOutputStream);

  virtual nsresult GetUndoString(nsString **aString);

  virtual nsresult GetRedoString(nsString **aString);

};

#endif