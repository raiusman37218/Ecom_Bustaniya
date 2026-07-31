--
-- PostgreSQL database dump
--

\restrict q46WnwysyxnULoRQNlaeCki8XueoKzUFtCtzCWItUPy7dDdHbG562l8OIL2pM6k

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: admin_adjust_inventory_v2(uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_adjust_inventory_v2(p_product_id uuid, p_change integer, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_before integer; v_after integer;
begin
  if p_change=0 then raise exception 'Adjustment cannot be zero'; end if;
  select stock_quantity into v_before from inventory where product_id=p_product_id for update;
  if not found then raise exception 'Inventory not found'; end if;
  v_after:=v_before+p_change;
  if v_after<0 then raise exception 'Insufficient stock'; end if;
  update inventory set stock_quantity=v_after,updated_at=now() where product_id=p_product_id;
  update products set instock=v_after>0 where id=p_product_id;
  insert into inventory_movements(product_id,quantity_change,reason,stock_before,stock_after) values(p_product_id,p_change,coalesce(nullif(trim(p_reason),''),'Manual adjustment'),v_before,v_after);
  return jsonb_build_object('product_id',p_product_id,'stock_quantity',v_after);
end;
$$;


--
-- Name: admin_create_product_v2(jsonb, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_create_product_v2(p_product jsonb, p_stock integer DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_product products%rowtype;
begin
  if trim(coalesce(p_product->>'name',''))='' then raise exception 'Product name is required'; end if;
  if coalesce((p_product->>'price')::numeric,0)<0 then raise exception 'Invalid price'; end if;
  insert into products(name,description,price,category,color,size,img,instock,new,bestsellere,article_number,delivery_fee_mode,delivery_fee_pkr)
  values(trim(p_product->>'name'),nullif(trim(p_product->>'description'),''),(p_product->>'price')::numeric,
    nullif(trim(p_product->>'category'),''),coalesce(p_product->'colors','[]'::jsonb)::text,
    coalesce(p_product->'sizes','[]'::jsonb)::text,coalesce(p_product->'images','[]'::jsonb)::text,
    greatest(p_stock,0)>0,coalesce((p_product->>'is_new')::boolean,false),coalesce((p_product->>'is_bestseller')::boolean,false),
    nullif(trim(p_product->>'article_number'),''),coalesce(nullif(p_product->>'delivery_fee_mode',''),'inherit'),
    case when p_product->>'delivery_fee_pkr' is null or p_product->>'delivery_fee_pkr'='' then null else (p_product->>'delivery_fee_pkr')::numeric end)
  returning * into v_product;
  insert into inventory(product_id,stock_quantity,low_stock_threshold,sku)
  values(v_product.id,greatest(p_stock,0),coalesce((p_product->>'low_stock_threshold')::integer,5),nullif(trim(p_product->>'sku'),''));
  return jsonb_build_object('id',v_product.id,'article_number',v_product.article_number);
end;$$;


--
-- Name: admin_delete_product_rpc(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_delete_product_rpc(access_key text, p_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Optional: validate access key
  IF access_key != current_setting('app.admin_access_key', true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM public.products WHERE id = p_id;
END;
$$;


--
-- Name: admin_delete_product_v2(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_delete_product_v2(p_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if exists(select 1 from order_items where product_id=p_id) then
    update products set instock=false where id=p_id;
    return false;
  end if;
  delete from inventory_movements where product_id=p_id;
  delete from inventory where product_id=p_id;
  delete from products where id=p_id;
  return found;
end;
$$;


--
-- Name: admin_delete_stock_entry_rpc(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_delete_stock_entry_rpc(access_key text, p_id text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT admin_verify_orders_key(access_key) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.stock_entries
  WHERE id = p_id;

  RETURN true;
END;
$$;


--
-- Name: admin_get_order_rpc(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_get_order_rpc(access_key text, p_order_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE result jsonb;
BEGIN
  IF NOT admin_verify_orders_key(access_key) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'id', o.id, 'order_number', o.order_number, 'status', o.status, 'created_at', o.created_at,
    'guest_email', o.guest_email, 'customer_email', o.customer_email, 'guest_name', o.guest_name,
    'guest_phone', o.guest_phone, 'shipping_full_name', o.shipping_full_name, 'shipping_phone', o.shipping_phone,
    'shipping_line1', o.shipping_line1, 'shipping_line2', o.shipping_line2, 'shipping_city', o.shipping_city,
    'shipping_region', o.shipping_region, 'shipping_country', o.shipping_country,
    'shipping_postal_code', o.shipping_postal_code, 'subtotal_pkr', o.subtotal_pkr,
    'shipping_fee_pkr', o.shipping_fee_pkr, 'total_pkr', o.total_pkr,
    'discount_amount_pkr', coalesce(o.discount_amount_pkr, 0), 'discount_code', o.discount_code,
    'billing_address', o.billing_address, 'payment_method', o.payment_method, 'notes', o.notes,
    'order_items', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', oi.id, 'product_id', oi.product_id, 'title', oi.title, 'unit_price_pkr', oi.unit_price_pkr,
      'quantity', oi.quantity, 'line_total_pkr', oi.line_total_pkr, 'size', oi.size, 'color', oi.color,
      'image_url', oi.image_url) ORDER BY oi.id) FROM order_items oi WHERE oi.order_id = o.id), '[]'::jsonb)
  ) INTO result FROM orders o WHERE o.id = p_order_id;
  RETURN result;
END;
$$;


--
-- Name: admin_insert_product_rpc(text, text, text, text, text, jsonb, jsonb, jsonb, boolean, boolean, boolean, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_insert_product_rpc(access_key text, p_name text, p_price text, p_category text, p_description text, p_color jsonb, p_size jsonb, p_img jsonb, p_instock boolean, p_bestsellere boolean, p_new boolean, p_article_number text DEFAULT NULL::text, p_stock_id text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_new_id uuid;
  v_result jsonb;
BEGIN
  IF NOT admin_verify_orders_key(access_key) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.products (
    name,
    price,
    category,
    description,
    color,
    size,
    img,
    instock,
    bestsellere,
    new,
    article_number,
    stock_id
  ) VALUES (
    p_name,
    p_price::numeric,
    p_category,
    p_description,
    p_color::text,
    p_size::text,
    p_img::text,
    p_instock,
    p_bestsellere,
    p_new,
    COALESCE(p_article_number, ('bu-p#'::text || lpad(nextval('public.product_article_number_seq'::regclass)::text, 3, '0'::text))),
    p_stock_id
  )
  RETURNING id INTO v_new_id;

  SELECT row_to_json(p)::jsonb INTO v_result
  FROM public.products p
  WHERE p.id = v_new_id;

  RETURN v_result;
END;
$$;


--
-- Name: admin_insert_stock_entry_rpc(text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_insert_stock_entry_rpc(access_key text, p_id text, p_description text, p_expenses jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT admin_verify_orders_key(access_key) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.stock_entries (
    id,
    description,
    expenses
  ) VALUES (
    p_id,
    p_description,
    p_expenses
  )
  RETURNING row_to_json(public.stock_entries.*)::jsonb INTO v_result;

  RETURN v_result;
END;
$$;


--
-- Name: admin_list_orders_rpc(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_list_orders_rpc(access_key text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not admin_verify_orders_key(access_key) then
    raise exception 'Unauthorized' using errcode='42501';
  end if;
  return coalesce((
    select jsonb_agg(row_data order by created_at desc)
    from (
      select jsonb_build_object(
        'id',o.id,'order_number',o.order_number,'status',o.status,'created_at',o.created_at,
        'guest_email',o.guest_email,'customer_email',o.customer_email,'guest_name',o.guest_name,
        'guest_phone',o.guest_phone,'shipping_full_name',o.shipping_full_name,'shipping_phone',o.shipping_phone,
        'shipping_line1',o.shipping_line1,'shipping_line2',o.shipping_line2,'shipping_city',o.shipping_city,
        'shipping_region',o.shipping_region,'shipping_country',o.shipping_country,
        'shipping_postal_code',o.shipping_postal_code,'subtotal_pkr',o.subtotal_pkr,
        'shipping_fee_pkr',o.shipping_fee_pkr,'total_pkr',o.total_pkr,
        'payment_method',o.payment_method,'notes',o.notes,
        'courier',o.courier,'courier_tracking_number',o.courier_tracking_number,
        'courier_status',o.courier_status,'courier_error',o.courier_error,
        'postex_booked_at',o.postex_booked_at,
        'order_items',coalesce((select jsonb_agg(jsonb_build_object(
          'id',oi.id,'product_id',oi.product_id,'title',oi.title,'unit_price_pkr',oi.unit_price_pkr,
          'quantity',oi.quantity,'line_total_pkr',oi.line_total_pkr,'size',oi.size,'color',oi.color,
          'image_url',oi.image_url) order by oi.id) from public.order_items oi where oi.order_id=o.id),'[]'::jsonb)
      ) as row_data,o.created_at from public.orders o
    ) sub
  ),'[]'::jsonb);
end;
$$;


--
-- Name: admin_sync_courier_status_rpc(text, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_sync_courier_status_rpc(access_key text, p_order_id uuid, p_courier_status text, p_response jsonb DEFAULT NULL::jsonb) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_store_status text;
begin
  if not admin_verify_orders_key(access_key) then
    raise exception 'Unauthorized' using errcode='42501';
  end if;
  v_store_status := case
    when lower(p_courier_status) like '%deliver%' and lower(p_courier_status) not like '%out for%' then 'delivered'
    when lower(p_courier_status) like '%return%' or lower(p_courier_status) like '%cancel%' or lower(p_courier_status) like '%expired%' then 'cancelled'
    when lower(p_courier_status) like '%out for delivery%' or lower(p_courier_status) like '%warehouse%' or lower(p_courier_status) like '%picked%' or lower(p_courier_status) like '%route%' then 'shipped'
    else 'processing'
  end;
  update public.orders set
    courier_status=p_courier_status,
    courier_response=coalesce(p_response,courier_response),
    status=v_store_status,
    updated_at=now()
  where id=p_order_id and courier_tracking_number is not null;
  return found;
end;
$$;


--
-- Name: admin_update_product_rpc(text, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_update_product_rpc(access_key text, p_id uuid, p_updates jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT admin_verify_orders_key(access_key) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.products
  SET
    name = COALESCE((p_updates->>'product_name'), name),
    price = COALESCE((p_updates->>'procuct_price')::numeric, price),
    category = COALESCE((p_updates->>'product_category'), category),
    description = COALESCE((p_updates->>'product_description'), description),
    color = CASE WHEN p_updates ? 'product_color' THEN (p_updates->'product_color')::text ELSE color END,
    size = CASE WHEN p_updates ? 'product_size' THEN (p_updates->'product_size')::text ELSE size END,
    img = CASE WHEN p_updates ? 'product_img' THEN (p_updates->'product_img')::text ELSE img END,
    instock = COALESCE((p_updates->>'product_instock')::boolean, instock),
    bestsellere = COALESCE((p_updates->>'product_bestsellere')::boolean, bestsellere),
    new = COALESCE((p_updates->>'product_new')::boolean, new),
    article_number = COALESCE((p_updates->>'article_number'), article_number),
    stock_id = CASE WHEN p_updates ? 'stock_id' THEN (p_updates->>'stock_id') ELSE stock_id END
  WHERE id = p_id;

  SELECT row_to_json(p)::jsonb INTO v_result
  FROM public.products p
  WHERE p.id = p_id;

  RETURN v_result;
END;
$$;


--
-- Name: admin_update_product_v2(uuid, jsonb, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_update_product_v2(p_id uuid, p_product jsonb, p_stock integer DEFAULT NULL::integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_before integer;v_after integer;v_product products%rowtype;
begin
  update products set name=coalesce(nullif(trim(p_product->>'name'),''),name),
    description=case when p_product?'description' then nullif(trim(p_product->>'description'),'') else description end,
    price=coalesce((p_product->>'price')::numeric,price),category=coalesce(nullif(trim(p_product->>'category'),''),category),
    color=case when p_product?'colors' then (p_product->'colors')::text else color end,
    size=case when p_product?'sizes' then (p_product->'sizes')::text else size end,
    img=case when p_product?'images' then (p_product->'images')::text else img end,
    new=coalesce((p_product->>'is_new')::boolean,new),bestsellere=coalesce((p_product->>'is_bestseller')::boolean,bestsellere),
    delivery_fee_mode=coalesce(nullif(p_product->>'delivery_fee_mode',''),delivery_fee_mode),
    delivery_fee_pkr=case when p_product?'delivery_fee_pkr' then nullif(p_product->>'delivery_fee_pkr','')::numeric else delivery_fee_pkr end
  where id=p_id returning * into v_product;
  if not found then raise exception 'Product not found'; end if;
  if p_stock is not null then
    select stock_quantity into v_before from inventory where product_id=p_id for update;
    if found then v_after:=greatest(p_stock,0);update inventory set stock_quantity=v_after,updated_at=now(),sku=coalesce(nullif(trim(p_product->>'sku'),''),sku) where product_id=p_id;
      if v_after<>v_before then insert into inventory_movements(product_id,quantity_change,reason,stock_before,stock_after) values(p_id,v_after-v_before,'Admin product update',v_before,v_after);end if;
    else insert into inventory(product_id,stock_quantity,sku) values(p_id,greatest(p_stock,0),nullif(trim(p_product->>'sku'),''));end if;
    update products set instock=greatest(p_stock,0)>0 where id=p_id;
  end if;
  return jsonb_build_object('id',v_product.id);
end;$$;


--
-- Name: admin_update_stock_entry_rpc(text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_update_stock_entry_rpc(access_key text, p_id text, p_description text, p_expenses jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT admin_verify_orders_key(access_key) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.stock_entries
  SET
    description = p_description,
    expenses = p_expenses
  WHERE id = p_id
  RETURNING row_to_json(public.stock_entries.*)::jsonb INTO v_result;

  RETURN v_result;
END;
$$;


--
-- Name: admin_verify_orders_key(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_verify_orders_key(access_key text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT access_key IS NOT NULL
    AND access_key = (SELECT orders_access_key FROM app_admin_config WHERE id = 1);
$$;


--
-- Name: bustaniya_set_courier_account_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bustaniya_set_courier_account_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ begin new.updated_at = now(); return new; end; $$;


--
-- Name: complete_postex_booking(uuid, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_postex_booking(p_order_id uuid, p_checkout_token uuid, p_tracking_number text, p_response jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_order public.orders%rowtype;
begin
  update public.orders set
    courier='PostEx', courier_tracking_number=p_tracking_number,
    courier_status='booked', courier_response=p_response, courier_error=null,
    postex_booked_at=now(), status='processing', updated_at=now()
  where id=p_order_id and checkout_token=p_checkout_token and courier_status='pending'
  returning * into v_order;
  if not found then raise exception 'Order not found or already finalized'; end if;
  return jsonb_build_object('order_id',v_order.id,'order_number',v_order.order_number,
    'tracking_number',v_order.courier_tracking_number,'total',v_order.total_pkr);
end;
$$;


--
-- Name: create_checkout_order(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_checkout_order(p_customer jsonb, p_items jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_order_id uuid:=gen_random_uuid();v_checkout_token uuid:=gen_random_uuid();
  v_order_number text:='BST-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  v_subtotal numeric:=0;v_shipping numeric:=0;v_total numeric:=0;v_item jsonb;
  v_product products%rowtype;v_inventory inventory%rowtype;v_quantity integer;v_item_count integer:=0;
  v_email text:=nullif(trim(coalesce(p_customer->>'email','')),'');
  v_full_name text:=trim((p_customer->>'firstName')||' '||(p_customer->>'lastName'));
  v_cod_fee numeric:=200;v_free_threshold numeric:=5000;v_has_nonfree boolean:=false;v_custom_fee numeric:=0;
begin
  select cod_delivery_fee_pkr,free_delivery_threshold_pkr into v_cod_fee,v_free_threshold from store_settings where id=1;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Cart is empty' using errcode='22023';end if;
  if trim(coalesce(p_customer->>'firstName',''))='' or trim(coalesce(p_customer->>'lastName',''))='' or trim(coalesce(p_customer->>'phone',''))='' or trim(coalesce(p_customer->>'address',''))='' or trim(coalesce(p_customer->>'city',''))='' then raise exception 'Missing delivery details' using errcode='22023';end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity:=greatest(1,least(20,coalesce((v_item->>'quantity')::integer,1)));
    select * into v_product from products where article_number=v_item->>'article_number' and instock=true for share;
    if not found then raise exception 'Product unavailable: %',v_item->>'article_number';end if;
    select * into v_inventory from inventory where product_id=v_product.id for update;
    if not found or v_inventory.stock_quantity<v_quantity then raise exception 'Insufficient stock for %',v_product.name using errcode='P0001';end if;
    v_subtotal:=v_subtotal+(v_product.price*v_quantity);v_item_count:=v_item_count+v_quantity;
    if v_product.delivery_fee_mode<>'free' then v_has_nonfree:=true;end if;
    if v_product.delivery_fee_mode='paid' and v_product.delivery_fee_pkr is not null then v_custom_fee:=greatest(v_custom_fee,v_product.delivery_fee_pkr);end if;
  end loop;
  v_shipping:=case when v_subtotal>=v_free_threshold then 0 when not v_has_nonfree then 0 else greatest(v_cod_fee,v_custom_fee) end;
  v_total:=v_subtotal+v_shipping;
  insert into orders(id,guest_email,guest_name,guest_phone,order_number,shipping_full_name,shipping_phone,shipping_line1,shipping_city,shipping_country,shipping_postal_code,subtotal_pkr,shipping_fee_pkr,total_pkr,payment_method,notes,status,customer_email,checkout_token,courier,courier_status,inventory_reserved_at)
  values(v_order_id,coalesce(v_email,'guest-'||lower(v_order_number)||'@bustaniya.local'),v_full_name,trim(p_customer->>'phone'),v_order_number,v_full_name,trim(p_customer->>'phone'),trim(p_customer->>'address'),trim(p_customer->>'city'),'Pakistan',nullif(trim(coalesce(p_customer->>'postalCode','')),''),v_subtotal,v_shipping,v_total,'cod',null,'pending',v_email,v_checkout_token,'PostEx','pending',now());
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity:=greatest(1,least(20,coalesce((v_item->>'quantity')::integer,1)));
    select * into v_product from products where article_number=v_item->>'article_number' and instock=true;
    insert into order_items(order_id,product_id,title,unit_price_pkr,quantity,line_total_pkr,size,color,image_url)
    values(v_order_id,v_product.id,v_product.name,v_product.price,v_quantity,v_product.price*v_quantity,nullif(v_item->>'size',''),nullif(v_item->>'color',''),v_product.img);
    update inventory set stock_quantity=stock_quantity-v_quantity,updated_at=now() where product_id=v_product.id;
  end loop;
  return jsonb_build_object('order_id',v_order_id,'checkout_token',v_checkout_token,'order_number',v_order_number,'subtotal',v_subtotal,'shipping',v_shipping,'total',v_total,'items',v_item_count);
end;$$;


--
-- Name: handle_new_product_inventory(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_product_inventory() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  insert into public.inventory(product_id, stock_quantity, low_stock_threshold, sku)
  values (new.id, 0, 5, new.article_number)
  on conflict (product_id) do nothing;
  return new;
end;
$$;


--
-- Name: release_checkout_order(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.release_checkout_order(p_order_id uuid, p_checkout_token uuid, p_error text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_item record;
begin
  if not exists(select 1 from public.orders where id=p_order_id and checkout_token=p_checkout_token and courier_status='pending' for update) then
    return false;
  end if;
  for v_item in select product_id, quantity from public.order_items where order_id=p_order_id
  loop
    update public.inventory set stock_quantity=stock_quantity+v_item.quantity, updated_at=now()
      where product_id=v_item.product_id;
  end loop;
  update public.orders set courier_status='failed', courier_error=left(p_error,1000),
    inventory_reserved_at=null, status='cancelled', updated_at=now()
    where id=p_order_id and checkout_token=p_checkout_token;
  return true;
end;
$$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'Staff'::text NOT NULL,
    permissions jsonb DEFAULT '[]'::jsonb NOT NULL,
    password_hash text NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp with time zone,
    CONSTRAINT admin_users_role_check CHECK ((role = ANY (ARRAY['Owner'::text, 'Staff'::text]))),
    CONSTRAINT admin_users_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Disabled'::text])))
);


--
-- Name: app_admin_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_admin_config (
    id integer DEFAULT 1 NOT NULL,
    orders_access_key text NOT NULL,
    CONSTRAINT app_admin_config_id_check CHECK ((id = 1))
);


--
-- Name: catalog_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalog_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    image text DEFAULT ''::text NOT NULL,
    parent_slug text,
    status text DEFAULT 'Active'::text NOT NULL,
    sort_order integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT catalog_categories_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Draft'::text, 'Archived'::text])))
);


--
-- Name: courier_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courier_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    provider text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    api_base_url text,
    merchant_id text,
    pickup_address_code text,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    credentials jsonb DEFAULT '{}'::jsonb NOT NULL,
    capabilities jsonb DEFAULT '{"cities": false, "booking": false, "tracking": false, "webhooks": false, "settlements": false}'::jsonb NOT NULL,
    last_synced_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT courier_accounts_code_check CHECK ((code ~ '^[a-z0-9][a-z0-9_-]{1,48}$'::text)),
    CONSTRAINT courier_accounts_name_check CHECK (((char_length(name) >= 2) AND (char_length(name) <= 100))),
    CONSTRAINT courier_accounts_provider_check CHECK ((provider = ANY (ARRAY['postex'::text, 'leopards'::text, 'tcs'::text, 'mnp'::text, 'trax'::text, 'callcourier'::text, 'blueex'::text, 'manual'::text, 'custom'::text]))),
    CONSTRAINT courier_accounts_status_check CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'disconnected'::text])))
);


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory (
    id bigint NOT NULL,
    product_id uuid NOT NULL,
    stock_quantity integer DEFAULT 0 NOT NULL,
    low_stock_threshold integer DEFAULT 5 NOT NULL,
    sku text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.inventory ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.inventory_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_movements (
    id bigint NOT NULL,
    product_id uuid NOT NULL,
    quantity_change integer NOT NULL,
    reason text NOT NULL,
    stock_before integer NOT NULL,
    stock_after integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inventory_movements_quantity_change_check CHECK ((quantity_change <> 0)),
    CONSTRAINT inventory_movements_stock_after_check CHECK ((stock_after >= 0))
);


--
-- Name: inventory_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.inventory_movements ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.inventory_movements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id bigint NOT NULL,
    order_id uuid NOT NULL,
    title text NOT NULL,
    unit_price_pkr numeric NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    line_total_pkr numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    size text,
    color text,
    image_url text,
    product_id uuid,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: COLUMN order_items.size; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_items.size IS 'Selected size at checkout';


--
-- Name: COLUMN order_items.color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_items.color IS 'Selected color at checkout';


--
-- Name: COLUMN order_items.image_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_items.image_url IS 'Product image URL at time of order';


--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.order_items ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.order_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid NOT NULL,
    user_id uuid,
    guest_email text NOT NULL,
    guest_name text,
    guest_phone text,
    order_number text NOT NULL,
    shipping_full_name text,
    shipping_phone text,
    shipping_line1 text,
    shipping_line2 text,
    shipping_city text,
    shipping_region text,
    shipping_country text,
    shipping_postal_code text,
    subtotal_pkr numeric NOT NULL,
    shipping_fee_pkr numeric DEFAULT 0 NOT NULL,
    total_pkr numeric NOT NULL,
    payment_method text DEFAULT 'cod'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    customer_email text,
    discount_amount_pkr numeric DEFAULT 0 NOT NULL,
    discount_code text,
    billing_address jsonb,
    courier text,
    courier_tracking_number text,
    courier_status text DEFAULT 'pending'::text NOT NULL,
    courier_response jsonb,
    courier_error text,
    checkout_token uuid DEFAULT gen_random_uuid() NOT NULL,
    inventory_reserved_at timestamp with time zone,
    postex_booked_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    courier_account_id uuid,
    courier_service_type text,
    courier_raw_status text,
    courier_normalized_status text DEFAULT 'unassigned'::text NOT NULL,
    courier_last_synced_at timestamp with time zone,
    courier_sync_error text,
    CONSTRAINT orders_courier_normalized_status_check CHECK ((courier_normalized_status = ANY (ARRAY['unassigned'::text, 'pending_booking'::text, 'booked'::text, 'picked_up'::text, 'in_transit'::text, 'out_for_delivery'::text, 'delivered'::text, 'attempted'::text, 'on_hold'::text, 'returned'::text, 'cancelled'::text, 'exception'::text, 'manual_delivery'::text]))),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text])))
);


--
-- Name: COLUMN orders.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.status IS 'Order fulfillment status for admin panel';


--
-- Name: COLUMN orders.customer_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.customer_email IS 'Customer email for order confirmation and notifications';


--
-- Name: COLUMN orders.discount_amount_pkr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.discount_amount_pkr IS 'Discount applied at checkout (PKR)';


--
-- Name: COLUMN orders.discount_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.discount_code IS 'Discount code used at checkout';


--
-- Name: COLUMN orders.billing_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.billing_address IS 'Separate billing address when different from shipping';


--
-- Name: postex_cpr_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.postex_cpr_batches (
    id bigint NOT NULL,
    cpr_number text NOT NULL,
    cpr_date date,
    period_start date,
    period_end date,
    expected_gross_pkr numeric(14,2) DEFAULT 0 NOT NULL,
    postex_deductions_pkr numeric(14,2) DEFAULT 0 NOT NULL,
    additional_deductions_pkr numeric(14,2) DEFAULT 0 NOT NULL,
    expected_bank_pkr numeric(14,2) DEFAULT 0 NOT NULL,
    bank_received_pkr numeric(14,2) DEFAULT 0 NOT NULL,
    bank_received_date date,
    carried_forward_pkr numeric(14,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    courier_account_id uuid,
    courier_provider text DEFAULT 'postex'::text NOT NULL,
    CONSTRAINT postex_cpr_batches_additional_deductions_pkr_check CHECK ((additional_deductions_pkr >= (0)::numeric)),
    CONSTRAINT postex_cpr_batches_bank_received_pkr_check CHECK ((bank_received_pkr >= (0)::numeric)),
    CONSTRAINT postex_cpr_batches_carried_forward_pkr_check CHECK ((carried_forward_pkr >= (0)::numeric)),
    CONSTRAINT postex_cpr_batches_expected_bank_pkr_check CHECK ((expected_bank_pkr >= (0)::numeric)),
    CONSTRAINT postex_cpr_batches_expected_gross_pkr_check CHECK ((expected_gross_pkr >= (0)::numeric)),
    CONSTRAINT postex_cpr_batches_postex_deductions_pkr_check CHECK ((postex_deductions_pkr >= (0)::numeric)),
    CONSTRAINT postex_cpr_batches_status_check CHECK ((status = ANY (ARRAY['open'::text, 'partial'::text, 'reconciled'::text, 'disputed'::text])))
);


--
-- Name: postex_cpr_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.postex_cpr_batches ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.postex_cpr_batches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: postex_cpr_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.postex_cpr_items (
    id bigint NOT NULL,
    batch_id bigint NOT NULL,
    order_payment_id bigint NOT NULL,
    expected_net_pkr numeric(14,2) DEFAULT 0 NOT NULL,
    allocated_received_pkr numeric(14,2) DEFAULT 0 NOT NULL,
    carried_forward_pkr numeric(14,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT postex_cpr_items_allocated_received_pkr_check CHECK ((allocated_received_pkr >= (0)::numeric)),
    CONSTRAINT postex_cpr_items_carried_forward_pkr_check CHECK ((carried_forward_pkr >= (0)::numeric)),
    CONSTRAINT postex_cpr_items_expected_net_pkr_check CHECK ((expected_net_pkr >= (0)::numeric))
);


--
-- Name: postex_cpr_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.postex_cpr_items ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.postex_cpr_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: postex_order_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.postex_order_payments (
    id bigint NOT NULL,
    order_id uuid NOT NULL,
    order_number text NOT NULL,
    tracking_number text NOT NULL,
    courier_status text DEFAULT ''::text NOT NULL,
    invoice_payment_pkr numeric(14,2) DEFAULT 0 NOT NULL,
    transaction_tax_pkr numeric(14,2) DEFAULT 0 NOT NULL,
    transaction_fee_pkr numeric(14,2) DEFAULT 0 NOT NULL,
    reversal_tax_pkr numeric(14,2) DEFAULT 0 NOT NULL,
    reversal_fee_pkr numeric(14,2) DEFAULT 0 NOT NULL,
    expected_net_pkr numeric(14,2) GENERATED ALWAYS AS (GREATEST(((((invoice_payment_pkr - transaction_tax_pkr) - transaction_fee_pkr) - reversal_tax_pkr) - reversal_fee_pkr), (0)::numeric)) STORED,
    postex_settled boolean DEFAULT false NOT NULL,
    settlement_date timestamp with time zone,
    cpr_number_1 text,
    cpr_date_1 timestamp with time zone,
    cpr_number_2 text,
    cpr_date_2 timestamp with time zone,
    payment_status text DEFAULT 'awaiting'::text NOT NULL,
    last_synced_at timestamp with time zone,
    last_error text,
    raw_response jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    courier_account_id uuid,
    courier_provider text DEFAULT 'postex'::text NOT NULL,
    CONSTRAINT postex_order_payments_invoice_payment_pkr_check CHECK ((invoice_payment_pkr >= (0)::numeric)),
    CONSTRAINT postex_order_payments_payment_status_check CHECK ((payment_status = ANY (ARRAY['in_transit'::text, 'awaiting'::text, 'settled'::text, 'returned'::text, 'cancelled'::text, 'error'::text]))),
    CONSTRAINT postex_order_payments_reversal_fee_pkr_check CHECK ((reversal_fee_pkr >= (0)::numeric)),
    CONSTRAINT postex_order_payments_reversal_tax_pkr_check CHECK ((reversal_tax_pkr >= (0)::numeric)),
    CONSTRAINT postex_order_payments_transaction_fee_pkr_check CHECK ((transaction_fee_pkr >= (0)::numeric)),
    CONSTRAINT postex_order_payments_transaction_tax_pkr_check CHECK ((transaction_tax_pkr >= (0)::numeric))
);


--
-- Name: postex_order_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.postex_order_payments ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.postex_order_payments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: product_article_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_article_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    name text NOT NULL,
    description text,
    price numeric NOT NULL,
    category text,
    color text,
    size text,
    img text,
    instock boolean DEFAULT true,
    new boolean DEFAULT false,
    bestsellere boolean DEFAULT false,
    stock_id text,
    article_number text DEFAULT ('bu-p#'::text || lpad((nextval('public.product_article_number_seq'::regclass))::text, 3, '0'::text)),
    delivery_fee_mode text DEFAULT 'inherit'::text NOT NULL,
    delivery_fee_pkr numeric,
    cost_total_pkr numeric(12,2) DEFAULT 0 NOT NULL,
    cost_breakdown jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT products_delivery_fee_mode_check CHECK ((delivery_fee_mode = ANY (ARRAY['inherit'::text, 'free'::text, 'paid'::text]))),
    CONSTRAINT products_delivery_fee_pkr_check CHECK (((delivery_fee_pkr IS NULL) OR (delivery_fee_pkr >= (0)::numeric)))
);


--
-- Name: stock_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_entries (
    id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    expenses jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: store_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_settings (
    id integer DEFAULT 1 NOT NULL,
    cod_delivery_fee_pkr numeric DEFAULT 200 NOT NULL,
    free_delivery_threshold_pkr numeric DEFAULT 5000 NOT NULL,
    advance_delivery_fee_pkr numeric DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    announcement_enabled boolean DEFAULT true NOT NULL,
    announcement_text text DEFAULT 'Rs. 300 advance payment required for order confirmation'::text NOT NULL,
    announcement_link_label text DEFAULT 'Shop now'::text,
    announcement_link_href text DEFAULT '#products'::text,
    announcements jsonb DEFAULT '[{"id": "default-advance-payment", "text": "Rs. 300 advance payment required for order confirmation", "enabled": true, "linkHref": "#products", "linkLabel": "Shop now"}]'::jsonb NOT NULL,
    hero_enabled boolean DEFAULT true NOT NULL,
    hero_desktop_image text DEFAULT '/bustaniya-campaign-hero-v5.png'::text NOT NULL,
    hero_mobile_image text DEFAULT '/bustaniya-campaign-hero-mobile-v1.png'::text NOT NULL,
    hero_eyebrow text DEFAULT 'NEW SEASON'::text NOT NULL,
    hero_heading text DEFAULT 'Elevated Eastern Wear'::text NOT NULL,
    hero_supporting_text text DEFAULT 'Thoughtfully designed kurtis for everyday elegance.'::text NOT NULL,
    hero_primary_button_text text DEFAULT 'Shop the collection'::text NOT NULL,
    hero_primary_button_link text DEFAULT '#products'::text NOT NULL,
    hero_secondary_button_text text DEFAULT ''::text NOT NULL,
    hero_secondary_button_link text DEFAULT ''::text NOT NULL,
    hero_text_alignment text DEFAULT 'left'::text NOT NULL,
    hero_text_position text DEFAULT 'left'::text NOT NULL,
    hero_overlay_intensity integer DEFAULT 34 NOT NULL,
    CONSTRAINT store_settings_advance_delivery_fee_pkr_check CHECK ((advance_delivery_fee_pkr >= (0)::numeric)),
    CONSTRAINT store_settings_cod_delivery_fee_pkr_check CHECK ((cod_delivery_fee_pkr >= (0)::numeric)),
    CONSTRAINT store_settings_free_delivery_threshold_pkr_check CHECK ((free_delivery_threshold_pkr >= (0)::numeric)),
    CONSTRAINT store_settings_id_check CHECK ((id = 1))
);


--
-- Name: admin_users admin_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_email_key UNIQUE (email);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: app_admin_config app_admin_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_admin_config
    ADD CONSTRAINT app_admin_config_pkey PRIMARY KEY (id);


--
-- Name: catalog_categories catalog_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_categories
    ADD CONSTRAINT catalog_categories_pkey PRIMARY KEY (id);


--
-- Name: catalog_categories catalog_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_categories
    ADD CONSTRAINT catalog_categories_slug_key UNIQUE (slug);


--
-- Name: courier_accounts courier_accounts_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courier_accounts
    ADD CONSTRAINT courier_accounts_code_key UNIQUE (code);


--
-- Name: courier_accounts courier_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courier_accounts
    ADD CONSTRAINT courier_accounts_pkey PRIMARY KEY (id);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_product_id_key UNIQUE (product_id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: postex_cpr_batches postex_cpr_batches_cpr_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postex_cpr_batches
    ADD CONSTRAINT postex_cpr_batches_cpr_number_key UNIQUE (cpr_number);


--
-- Name: postex_cpr_batches postex_cpr_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postex_cpr_batches
    ADD CONSTRAINT postex_cpr_batches_pkey PRIMARY KEY (id);


--
-- Name: postex_cpr_items postex_cpr_items_batch_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postex_cpr_items
    ADD CONSTRAINT postex_cpr_items_batch_order_key UNIQUE (batch_id, order_payment_id);


--
-- Name: postex_cpr_items postex_cpr_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postex_cpr_items
    ADD CONSTRAINT postex_cpr_items_pkey PRIMARY KEY (id);


--
-- Name: postex_order_payments postex_order_payments_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postex_order_payments
    ADD CONSTRAINT postex_order_payments_order_id_key UNIQUE (order_id);


--
-- Name: postex_order_payments postex_order_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postex_order_payments
    ADD CONSTRAINT postex_order_payments_pkey PRIMARY KEY (id);


--
-- Name: postex_order_payments postex_order_payments_tracking_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postex_order_payments
    ADD CONSTRAINT postex_order_payments_tracking_number_key UNIQUE (tracking_number);


--
-- Name: products products_article_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_article_number_key UNIQUE (article_number);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: stock_entries stock_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_entries
    ADD CONSTRAINT stock_entries_pkey PRIMARY KEY (id);


--
-- Name: store_settings store_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_settings
    ADD CONSTRAINT store_settings_pkey PRIMARY KEY (id);


--
-- Name: admin_users_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_users_email_idx ON public.admin_users USING btree (email);


--
-- Name: admin_users_role_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_users_role_status_idx ON public.admin_users USING btree (role, status);


--
-- Name: catalog_categories_parent_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX catalog_categories_parent_slug_idx ON public.catalog_categories USING btree (parent_slug);


--
-- Name: catalog_categories_status_sort_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX catalog_categories_status_sort_idx ON public.catalog_categories USING btree (status, sort_order);


--
-- Name: courier_accounts_one_default_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX courier_accounts_one_default_idx ON public.courier_accounts USING btree (is_default) WHERE is_default;


--
-- Name: courier_accounts_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX courier_accounts_status_idx ON public.courier_accounts USING btree (status, name);


--
-- Name: inventory_movements_product_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_movements_product_created_idx ON public.inventory_movements USING btree (product_id, created_at DESC);


--
-- Name: order_items_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_items_order_id_idx ON public.order_items USING btree (order_id);


--
-- Name: order_items_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_items_product_id_idx ON public.order_items USING btree (product_id);


--
-- Name: orders_checkout_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX orders_checkout_token_idx ON public.orders USING btree (checkout_token);


--
-- Name: orders_courier_account_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_courier_account_status_idx ON public.orders USING btree (courier_account_id, courier_normalized_status, created_at DESC);


--
-- Name: orders_courier_sync_error_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_courier_sync_error_idx ON public.orders USING btree (courier_last_synced_at DESC) WHERE (courier_sync_error IS NOT NULL);


--
-- Name: orders_courier_tracking_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_courier_tracking_idx ON public.orders USING btree (courier_tracking_number) WHERE (courier_tracking_number IS NOT NULL);


--
-- Name: orders_courier_tracking_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX orders_courier_tracking_number_idx ON public.orders USING btree (courier_tracking_number) WHERE (courier_tracking_number IS NOT NULL);


--
-- Name: orders_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_created_at_idx ON public.orders USING btree (created_at DESC);


--
-- Name: orders_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_status_idx ON public.orders USING btree (status);


--
-- Name: orders_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_user_id_idx ON public.orders USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: postex_cpr_batches_courier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX postex_cpr_batches_courier_idx ON public.postex_cpr_batches USING btree (courier_account_id, cpr_date DESC);


--
-- Name: postex_cpr_batches_status_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX postex_cpr_batches_status_date_idx ON public.postex_cpr_batches USING btree (status, cpr_date DESC);


--
-- Name: postex_cpr_items_order_payment_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX postex_cpr_items_order_payment_id_idx ON public.postex_cpr_items USING btree (order_payment_id);


--
-- Name: postex_order_payments_courier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX postex_order_payments_courier_idx ON public.postex_order_payments USING btree (courier_account_id, payment_status);


--
-- Name: postex_order_payments_settlement_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX postex_order_payments_settlement_date_idx ON public.postex_order_payments USING btree (settlement_date DESC) WHERE (settlement_date IS NOT NULL);


--
-- Name: postex_order_payments_status_sync_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX postex_order_payments_status_sync_idx ON public.postex_order_payments USING btree (payment_status, last_synced_at DESC);


--
-- Name: products_stock_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_stock_id_idx ON public.products USING btree (stock_id) WHERE (stock_id IS NOT NULL);


--
-- Name: courier_accounts bustaniya_courier_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER bustaniya_courier_accounts_updated_at BEFORE UPDATE ON public.courier_accounts FOR EACH ROW EXECUTE FUNCTION public.bustaniya_set_courier_account_updated_at();


--
-- Name: products products_create_inventory; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER products_create_inventory AFTER INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_new_product_inventory();


--
-- Name: inventory_movements inventory_movements_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: inventory inventory_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: orders orders_courier_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_courier_account_id_fkey FOREIGN KEY (courier_account_id) REFERENCES public.courier_accounts(id) ON DELETE SET NULL;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: postex_cpr_batches postex_cpr_batches_courier_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postex_cpr_batches
    ADD CONSTRAINT postex_cpr_batches_courier_account_id_fkey FOREIGN KEY (courier_account_id) REFERENCES public.courier_accounts(id) ON DELETE SET NULL;


--
-- Name: postex_cpr_items postex_cpr_items_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postex_cpr_items
    ADD CONSTRAINT postex_cpr_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.postex_cpr_batches(id) ON DELETE CASCADE;


--
-- Name: postex_cpr_items postex_cpr_items_order_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postex_cpr_items
    ADD CONSTRAINT postex_cpr_items_order_payment_id_fkey FOREIGN KEY (order_payment_id) REFERENCES public.postex_order_payments(id) ON DELETE CASCADE;


--
-- Name: postex_order_payments postex_order_payments_courier_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postex_order_payments
    ADD CONSTRAINT postex_order_payments_courier_account_id_fkey FOREIGN KEY (courier_account_id) REFERENCES public.courier_accounts(id) ON DELETE SET NULL;


--
-- Name: postex_order_payments postex_order_payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postex_order_payments
    ADD CONSTRAINT postex_order_payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: products products_stock_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_stock_id_fkey FOREIGN KEY (stock_id) REFERENCES public.stock_entries(id) ON DELETE SET NULL;


--
-- Name: stock_entries Allow all access to service role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to service role" ON public.stock_entries TO service_role USING (true) WITH CHECK (true);


--
-- Name: stock_entries Allow public select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public select" ON public.stock_entries FOR SELECT USING (true);


--
-- Name: catalog_categories Public active catalog categories are readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public active catalog categories are readable" ON public.catalog_categories FOR SELECT TO authenticated, anon USING ((status = 'Active'::text));


--
-- Name: inventory Public active product inventory is readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public active product inventory is readable" ON public.inventory FOR SELECT TO authenticated, anon USING ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = inventory.product_id) AND (p.instock = true)))));


--
-- Name: products Public active products are readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public active products are readable" ON public.products FOR SELECT TO authenticated, anon USING (((instock = true) AND (COALESCE(category, ''::text) <> 'Custom Inventory'::text)));


--
-- Name: products Public can read products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read products" ON public.products FOR SELECT USING (true);


--
-- Name: admin_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

--
-- Name: app_admin_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_admin_config ENABLE ROW LEVEL SECURITY;

--
-- Name: catalog_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.catalog_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: courier_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courier_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: postex_cpr_batches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.postex_cpr_batches ENABLE ROW LEVEL SECURITY;

--
-- Name: postex_cpr_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.postex_cpr_items ENABLE ROW LEVEL SECURITY;

--
-- Name: postex_order_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.postex_order_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: store_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict q46WnwysyxnULoRQNlaeCki8XueoKzUFtCtzCWItUPy7dDdHbG562l8OIL2pM6k

